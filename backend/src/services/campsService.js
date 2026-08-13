import { randomUUID } from "node:crypto";
import { ValidationError, NotFoundError } from "../lib/errors.js";

const CAMP_VEHICLE_TYPES = ["car", "bike"];

function validateInput({ name, vehicleType }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new ValidationError("name is required");
  }
  if (!CAMP_VEHICLE_TYPES.includes(vehicleType)) {
    throw new ValidationError("vehicleType must be one of car, bike");
  }
}

export function createCampsService(campsRepository) {
  return {
    async list() {
      return campsRepository.list();
    },

    async get(campId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      return camp;
    },

    async create({ name, date, vehicleType }) {
      validateInput({ name, vehicleType });
      const now = new Date().toISOString();
      const camp = {
        campId: randomUUID(),
        name: name.trim(),
        date: date || null,
        vehicleType,
        createdAt: now,
        updatedAt: now,
      };
      return campsRepository.put(camp);
    },

    async update(campId, { name, date, vehicleType }) {
      const existing = await campsRepository.get(campId);
      if (!existing) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
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

    async remove(campId) {
      const existing = await campsRepository.get(campId);
      if (!existing) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      await campsRepository.delete(campId);
    },
  };
}
