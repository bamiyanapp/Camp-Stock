import { randomUUID } from "node:crypto";
import { isValidVehicleType } from "../domain/vehicleType.js";
import { ValidationError, NotFoundError } from "../lib/errors.js";

function validateInput({ name, category, vehicleType }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new ValidationError("name is required");
  }
  if (!category || typeof category !== "string" || !category.trim()) {
    throw new ValidationError("category is required");
  }
  if (!isValidVehicleType(vehicleType)) {
    throw new ValidationError(
      "vehicleType must be one of car, bike, both"
    );
  }
}

// 車・バイクそれぞれで「新しいキャンプ作成時に既定で持っていくか」を持つ
// （issue #221）。省略時はtrue（既存の全件を持っていく既定動作を維持する）。
function resolveDefaultUsed(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  return typeof fallback === "boolean" ? fallback : true;
}

export function createItemsService(itemsRepository) {
  return {
    async list() {
      return itemsRepository.list();
    },

    async create(
      { name, category, vehicleType, emoji, storageLocation, notes, defaultUsedForCar, defaultUsedForBike },
      userId
    ) {
      validateInput({ name, category, vehicleType });
      const now = new Date().toISOString();
      const item = {
        itemId: randomUUID(),
        name: name.trim(),
        category: category.trim(),
        vehicleType,
        emoji: emoji || null,
        storageLocation: storageLocation || null,
        notes: notes || null,
        defaultUsedForCar: resolveDefaultUsed(defaultUsedForCar),
        defaultUsedForBike: resolveDefaultUsed(defaultUsedForBike),
        createdBy: userId || null,
        updatedBy: userId || null,
        createdAt: now,
        updatedAt: now,
      };
      return itemsRepository.put(item);
    },

    async update(
      itemId,
      { name, category, vehicleType, emoji, storageLocation, notes, defaultUsedForCar, defaultUsedForBike },
      userId
    ) {
      const existing = await itemsRepository.get(itemId);
      if (!existing) {
        throw new NotFoundError(`item not found: ${itemId}`);
      }
      validateInput({ name, category, vehicleType });
      const updated = {
        ...existing,
        name: name.trim(),
        category: category.trim(),
        vehicleType,
        emoji: emoji || null,
        storageLocation: storageLocation || null,
        notes: notes || null,
        defaultUsedForCar: resolveDefaultUsed(defaultUsedForCar, existing.defaultUsedForCar),
        defaultUsedForBike: resolveDefaultUsed(defaultUsedForBike, existing.defaultUsedForBike),
        updatedBy: userId || null,
        updatedAt: new Date().toISOString(),
      };
      return itemsRepository.put(updated);
    },

    async remove(itemId) {
      const existing = await itemsRepository.get(itemId);
      if (!existing) {
        throw new NotFoundError(`item not found: ${itemId}`);
      }
      await itemsRepository.delete(itemId);
    },
  };
}
