import { randomUUID } from "node:crypto";
import { ValidationError, NotFoundError } from "../lib/errors.js";
import { assertCampOwner, assertCampMember } from "./campAuthorization.js";

export { assertCampOwner };

const CAMP_VEHICLE_TYPES = ["car", "bike"];

function validateInput({ name, vehicleType }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new ValidationError("name is required");
  }
  if (!CAMP_VEHICLE_TYPES.includes(vehicleType)) {
    throw new ValidationError("vehicleType must be one of car, bike");
  }
}

export function createCampsService(campsRepository, campMembersRepository) {
  return {
    // 自分が所有者のキャンプに加え、招待リンクで参加済みのキャンプも一覧に含める。
    async list(userId) {
      const [camps, memberships] = await Promise.all([
        campsRepository.list(),
        campMembersRepository.list(),
      ]);
      const owner = userId || null;
      const memberCampIds = new Set(
        memberships.filter((m) => m.userId === owner).map((m) => m.campId)
      );
      return camps.filter(
        (camp) => (camp.ownerUserId || null) === owner || memberCampIds.has(camp.campId)
      );
    },

    // 所有者・参加者であれば取得可能（参照系のため、編集不可の参加者にも許可する）。
    async get(campId, userId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      await assertCampMember(camp, userId, campMembersRepository);
      return camp;
    },

    async create({ name, date, vehicleType }, ownerUserId, ownerProfile = {}) {
      validateInput({ name, vehicleType });
      const now = new Date().toISOString();
      const camp = {
        campId: randomUUID(),
        name: name.trim(),
        date: date || null,
        vehicleType,
        ownerUserId: ownerUserId || null,
        ownerName: ownerProfile.name || null,
        ownerEmail: ownerProfile.email || null,
        ownerPicture: ownerProfile.picture || null,
        // 招待リンクの元になるトークン。所有者はcampMembersService.
        // regenerateInviteTokenでいつでも再発行できる。
        inviteToken: randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      return campsRepository.put(camp);
    },

    // キャンプ設定の変更は所有者のみ許可する（参加者は不可）。
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

    // キャンプの削除は所有者のみ許可する（参加者は不可）。
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
