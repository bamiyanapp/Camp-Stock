import { matchesVehicle } from "../domain/vehicleType.js";
import { NotFoundError } from "../lib/errors.js";
import { assertCampMember } from "./campAuthorization.js";

// キャンプの移動手段（car/bike）に応じて、持ち物マスタのどちらの「既定で
// 持っていくか」フィールドを見る・更新するかを決める（issue #221）。
function defaultUsedFieldFor(campVehicleType) {
  return campVehicleType === "car" ? "defaultUsedForCar" : "defaultUsedForBike";
}

// キャンプごとの持ち物状態は、CampItemsテーブルに「今回使う」として選択された
// アイテムのレコードのみを持つ設計にする（レコードが存在する = used）。
// 積んだかどうか（packed）はそのレコードの属性として管理する。
// 使用/積み込みの操作は、所有者に限らずキャンプの参加者全員に許可する
// （招待リンクによる複数参加者対応、#90）。
export function createCampItemsService({
  campsRepository,
  itemsRepository,
  campItemsRepository,
  campMembersRepository,
}) {
  return {
    // 持ち物マスタのうち、キャンプの移動手段に対応する候補一覧を、
    // このキャンプでの使用中/積み込み状態とマージして返す。
    async listForCamp(campId, userId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      await assertCampMember(camp, userId, campMembersRepository);
      const [allItems, campItems] = await Promise.all([
        itemsRepository.list(),
        campItemsRepository.listByCamp(campId),
      ]);
      const campItemByItemId = new Map(
        campItems.map((campItem) => [campItem.itemId, campItem])
      );
      return allItems
        .filter((item) => matchesVehicle(item.vehicleType, camp.vehicleType))
        .map((item) => {
          const campItem = campItemByItemId.get(item.itemId);
          return {
            ...item,
            used: Boolean(campItem),
            packed: campItem ? Boolean(campItem.packed) : false,
            assignedUserId: campItem ? campItem.assignedUserId || null : null,
          };
        });
    },

    async setUsed(campId, itemId, used, userId) {
      const [camp, item] = await Promise.all([
        campsRepository.get(campId),
        itemsRepository.get(itemId),
      ]);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      if (!item) {
        throw new NotFoundError(`item not found: ${itemId}`);
      }
      await assertCampMember(camp, userId, campMembersRepository);

      // 今回の実際の使用/不使用を、キャンプの移動手段に対応する「既定で
      // 持っていくか」の実績として持ち物マスタへ反映する。次回以降の同じ
      // 移動手段のキャンプ作成時（seedAllMatchingItems）はこの実績を引き継ぐ
      // （issue #221）。もう一方の移動手段側の実績には影響しない。
      const defaultUsedField = defaultUsedFieldFor(camp.vehicleType);
      if (item[defaultUsedField] !== used) {
        await itemsRepository.put({
          ...item,
          [defaultUsedField]: used,
          updatedAt: new Date().toISOString(),
        });
      }

      if (!used) {
        await campItemsRepository.delete(campId, itemId);
        return { campId, itemId, used: false, packed: false, assignedUserId: null };
      }

      const existing = await campItemsRepository.get(campId, itemId);
      if (existing) {
        return {
          campId,
          itemId,
          used: true,
          packed: Boolean(existing.packed),
          assignedUserId: existing.assignedUserId || null,
        };
      }
      const now = new Date().toISOString();
      const campItem = {
        campId,
        itemId,
        packed: false,
        assignedUserId: null,
        addedAt: now,
        updatedAt: now,
      };
      await campItemsRepository.put(campItem);
      return { campId, itemId, used: true, packed: false, assignedUserId: null };
    },

    // 新しいキャンプ作成直後に呼び出し、移動手段が対応する持ち物マスタのうち
    // 「既定で持っていく」（defaultUsedForCar/defaultUsedForBike、前回までの
    // 実績を引き継いだ値。フィールド未設定の持ち物は互換のためtrue扱い）と
    // なっている持ち物を「今回使う」状態（used: true）で初期化する
    // （issue #221）。それ以外の持ち物は、選択編集画面（フロントエンドの
    // 持ち物選択ページ）から個別に追加する運用とする。packed（積み込み状態）
    // は常にfalseから始める。
    async seedAllMatchingItems(campId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      const defaultUsedField = defaultUsedFieldFor(camp.vehicleType);
      const allItems = await itemsRepository.list();
      const matchingItems = allItems
        .filter((item) => matchesVehicle(item.vehicleType, camp.vehicleType))
        .filter((item) => item[defaultUsedField] !== false);
      const now = new Date().toISOString();
      await Promise.all(
        matchingItems.map((item) =>
          campItemsRepository.put({
            campId,
            itemId: item.itemId,
            packed: false,
            assignedUserId: null,
            addedAt: now,
            updatedAt: now,
          })
        )
      );
    },

    async setPacked(campId, itemId, packed, userId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      await assertCampMember(camp, userId, campMembersRepository);
      const existing = await campItemsRepository.get(campId, itemId);
      if (!existing) {
        throw new NotFoundError(
          `item is not marked as used for this camp: ${itemId}`
        );
      }
      const updated = {
        ...existing,
        packed: Boolean(packed),
        updatedAt: new Date().toISOString(),
      };
      await campItemsRepository.put(updated);
      return {
        campId,
        itemId,
        used: true,
        packed: updated.packed,
        assignedUserId: updated.assignedUserId || null,
      };
    },

    // 持ち物ごとの担当者（誰が持ってくるか）を設定・解除する。「今回使う」に
    // 選択されている（CampItemsレコードが存在する）持ち物のみ対象。
    // nullを渡すと未割り当てに戻す。
    async setAssignee(campId, itemId, assignedUserId, userId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      await assertCampMember(camp, userId, campMembersRepository);
      const existing = await campItemsRepository.get(campId, itemId);
      if (!existing) {
        throw new NotFoundError(
          `item is not marked as used for this camp: ${itemId}`
        );
      }
      const updated = {
        ...existing,
        assignedUserId: assignedUserId || null,
        updatedAt: new Date().toISOString(),
      };
      await campItemsRepository.put(updated);
      return {
        campId,
        itemId,
        used: true,
        packed: Boolean(updated.packed),
        assignedUserId: updated.assignedUserId,
      };
    },
  };
}
