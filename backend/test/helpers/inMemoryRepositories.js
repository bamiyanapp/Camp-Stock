export function createInMemoryItemsRepository(initialItems = []) {
  const items = new Map(initialItems.map((item) => [item.itemId, item]));
  return {
    async list() {
      return [...items.values()];
    },
    async get(itemId) {
      return items.get(itemId) || null;
    },
    async put(item) {
      items.set(item.itemId, item);
      return item;
    },
    async delete(itemId) {
      items.delete(itemId);
    },
  };
}

export function createInMemoryCampsRepository(initialCamps = []) {
  const camps = new Map(initialCamps.map((camp) => [camp.campId, camp]));
  return {
    async list() {
      return [...camps.values()];
    },
    async get(campId) {
      return camps.get(campId) || null;
    },
    async put(camp) {
      camps.set(camp.campId, camp);
      return camp;
    },
    async delete(campId) {
      camps.delete(campId);
    },
  };
}

export function createInMemoryCampItemsRepository(initialCampItems = []) {
  const key = (campId, itemId) => `${campId}#${itemId}`;
  const campItems = new Map(
    initialCampItems.map((campItem) => [
      key(campItem.campId, campItem.itemId),
      campItem,
    ])
  );
  return {
    async listByCamp(campId) {
      return [...campItems.values()].filter((ci) => ci.campId === campId);
    },
    async get(campId, itemId) {
      return campItems.get(key(campId, itemId)) || null;
    },
    async put(campItem) {
      campItems.set(key(campItem.campId, campItem.itemId), campItem);
      return campItem;
    },
    async delete(campId, itemId) {
      campItems.delete(key(campId, itemId));
    },
  };
}
