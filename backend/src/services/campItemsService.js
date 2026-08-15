import { matchesVehicle } from "../domain/vehicleType.js";
import { NotFoundError } from "../lib/errors.js";
import { assertCampMember } from "./campAuthorization.js";

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

      if (!used) {
        await campItemsRepository.delete(campId, itemId);
        return { campId, itemId, used: false, packed: false };
      }

      const existing = await campItemsRepository.get(campId, itemId);
      if (existing) {
        return {
          campId,
          itemId,
          used: true,
          packed: Boolean(existing.packed),
        };
      }
      const now = new Date().toISOString();
      const campItem = {
        campId,
        itemId,
        packed: false,
        addedAt: now,
        updatedAt: now,
      };
      await campItemsRepository.put(campItem);
      return { campId, itemId, used: true, packed: false };
    },

    // 新しいキャンプ作成直後に呼び出し、移動手段が対応する持ち物マスタ全件を
    // 「今回使う」状態（used: true）で初期化する。今回使わない持ち物は、
    // 選択編集画面（フロントエンドの持ち物選択ページ）から個別に外す運用とする。
    // packed（積み込み状態）は常にfalseから始める。
    async seedAllMatchingItems(campId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      const allItems = await itemsRepository.list();
      const matchingItems = allItems.filter((item) =>
        matchesVehicle(item.vehicleType, camp.vehicleType)
      );
      const now = new Date().toISOString();
      await Promise.all(
        matchingItems.map((item) =>
          campItemsRepository.put({
            campId,
            itemId: item.itemId,
            packed: false,
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
      return { campId, itemId, used: true, packed: updated.packed };
    },
  };
}
