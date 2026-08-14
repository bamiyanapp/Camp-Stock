import { matchesVehicle } from "../domain/vehicleType.js";
import { NotFoundError } from "../lib/errors.js";
import { assertCampOwner } from "./campsService.js";

// キャンプごとの持ち物状態は、CampItemsテーブルに「今回使う」として選択された
// アイテムのレコードのみを持つ設計にする（レコードが存在する = used）。
// 積んだかどうか（packed）はそのレコードの属性として管理する。
export function createCampItemsService({
  campsRepository,
  itemsRepository,
  campItemsRepository,
}) {
  return {
    // 持ち物マスタのうち、キャンプの移動手段に対応する候補一覧を、
    // このキャンプでの使用中/積み込み状態とマージして返す。
    async listForCamp(campId, ownerUserId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      assertCampOwner(camp, ownerUserId);
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

    async setUsed(campId, itemId, used, ownerUserId) {
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
      assertCampOwner(camp, ownerUserId);

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

    // 新しいキャンプ作成直後に呼び出し、同じユーザーの直近の別キャンプ
    // （createdAt降順で最新の1件）で「今回使う」だった持ち物のうち、
    // 新しいキャンプの移動手段に対応するものを自動的に引き継ぐ。
    // packed（積み込み状態）は引き継がず、常に未積み込みから始める。
    async seedFromPreviousCamp(campId, ownerUserId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      const owner = ownerUserId || null;
      const allCamps = await campsRepository.list();
      const previousCamp = allCamps
        .filter(
          (c) => c.campId !== campId && (c.ownerUserId || null) === owner
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      if (!previousCamp) {
        return;
      }

      const [previousCampItems, allItems] = await Promise.all([
        campItemsRepository.listByCamp(previousCamp.campId),
        itemsRepository.list(),
      ]);
      const itemById = new Map(allItems.map((item) => [item.itemId, item]));
      const now = new Date().toISOString();
      for (const previousCampItem of previousCampItems) {
        const item = itemById.get(previousCampItem.itemId);
        if (!item || !matchesVehicle(item.vehicleType, camp.vehicleType)) {
          continue;
        }
        await campItemsRepository.put({
          campId,
          itemId: previousCampItem.itemId,
          packed: false,
          addedAt: now,
          updatedAt: now,
        });
      }
    },

    async setPacked(campId, itemId, packed, ownerUserId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      assertCampOwner(camp, ownerUserId);
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
