import { randomUUID } from "node:crypto";
import { ValidationError, NotFoundError, ForbiddenError } from "../lib/errors.js";

const CAMP_VEHICLE_TYPES = ["car", "bike"];

function validateInput({ name, vehicleType }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new ValidationError("name is required");
  }
  if (!CAMP_VEHICLE_TYPES.includes(vehicleType)) {
    throw new ValidationError("vehicleType must be one of car, bike");
  }
}

// キャンプはユーザー個別データのため、所有者（ownerUserId）と一致しない
// リクエストは常に403で拒否する。campItemsService（campsServiceの外から
// キャンプの所有者チェックが必要な箇所）でも再利用する。
export function assertCampOwner(camp, ownerUserId) {
  if ((camp.ownerUserId || null) !== (ownerUserId || null)) {
    throw new ForbiddenError(`camp is not owned by the requesting user: ${camp.campId}`);
  }
}

export function createCampsService(campsRepository) {
  return {
    async list(ownerUserId) {
      const camps = await campsRepository.list();
      const owner = ownerUserId || null;
      return camps.filter((camp) => (camp.ownerUserId || null) === owner);
    },

    async get(campId, ownerUserId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      assertCampOwner(camp, ownerUserId);
      return camp;
    },

    async create({ name, date, vehicleType }, ownerUserId) {
      validateInput({ name, vehicleType });
      const now = new Date().toISOString();
      const camp = {
        campId: randomUUID(),
        name: name.trim(),
        date: date || null,
        vehicleType,
        ownerUserId: ownerUserId || null,
        createdAt: now,
        updatedAt: now,
      };
      return campsRepository.put(camp);
    },

    async update(campId, { name, date, vehicleType }, ownerUserId) {
      const existing = await campsRepository.get(campId);
      if (!existing) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      assertCampOwner(existing, ownerUserId);
      validateInput({ name, vehicleType });
      const updated = {
        ...existing,
        name: name.trim(),
        date: date || null,
        vehicleType,
        updatedAt: new Date().toISOString(),
      };
      return campsRepository.put(updated);
    },

    async remove(campId, ownerUserId) {
      const existing = await campsRepository.get(campId);
      if (!existing) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      assertCampOwner(existing, ownerUserId);
      await campsRepository.delete(campId);
    },
  };
}
