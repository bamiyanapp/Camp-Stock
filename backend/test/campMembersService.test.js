import { describe, it, expect, beforeEach } from "vitest";
import { createCampMembersService } from "../src/services/campMembersService.js";
import {
  createInMemoryCampsRepository,
  createInMemoryCampMembersRepository,
} from "./helpers/inMemoryRepositories.js";

describe("campMembersService", () => {
  let campsRepository;
  let campMembersRepository;
  let service;
  let camp;

  beforeEach(() => {
    camp = {
      campId: "camp-1",
      name: "夏キャンプ",
      vehicleType: "car",
      ownerUserId: "user-1",
      ownerName: "オーナー",
      ownerEmail: "owner@example.com",
      inviteToken: "invite-token-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    campsRepository = createInMemoryCampsRepository([camp]);
    campMembersRepository = createInMemoryCampMembersRepository();
    service = createCampMembersService({ campsRepository, campMembersRepository });
  });

  describe("join", () => {
    it("有効な招待トークンで参加すると、CampMembersにレコードが作成される", async () => {
      const result = await service.join("invite-token-1", {
        userId: "user-2",
        name: "参加者",
        email: "member@example.com",
      });
      expect(result.campId).toBe("camp-1");

      const membership = await campMembersRepository.get("camp-1", "user-2");
      expect(membership).not.toBeNull();
      expect(membership.name).toBe("参加者");
    });

    it("既に参加済みのユーザーが再度参加してもレコードは重複しない", async () => {
      await service.join("invite-token-1", { userId: "user-2", name: "参加者" });
      await service.join("invite-token-1", { userId: "user-2", name: "参加者" });

      const memberships = await campMembersRepository.listByCamp("camp-1");
      expect(memberships).toHaveLength(1);
    });

    it("所有者自身が自分の招待リンクを開いても、CampMembersにはレコードを作らない", async () => {
      await service.join("invite-token-1", { userId: "user-1", name: "オーナー" });

      const memberships = await campMembersRepository.listByCamp("camp-1");
      expect(memberships).toHaveLength(0);
    });

    it("存在しない招待トークンならNotFoundErrorを投げる", async () => {
      await expect(
        service.join("missing-token", { userId: "user-2" })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("未ログイン（userIdが無い）状態ではForbiddenErrorを投げる", async () => {
      await expect(service.join("invite-token-1", null)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe("listMembers", () => {
    it("所有者と参加者をあわせて返す", async () => {
      await service.join("invite-token-1", { userId: "user-2", name: "参加者" });

      const members = await service.listMembers("camp-1", "user-1");
      expect(members).toHaveLength(2);
      expect(members.find((m) => m.userId === "user-1").role).toBe("owner");
      expect(members.find((m) => m.userId === "user-2").role).toBe("member");
    });

    it("招待されていない他ユーザーはForbiddenErrorを投げる", async () => {
      await expect(service.listMembers("camp-1", "user-3")).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("存在しないcampIdならNotFoundErrorを投げる", async () => {
      await expect(service.listMembers("missing", "user-1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("regenerateInviteToken", () => {
    it("所有者は招待トークンを再発行できる", async () => {
      const updated = await service.regenerateInviteToken("camp-1", "user-1");
      expect(updated.inviteToken).not.toBe("invite-token-1");
    });

    it("再発行後は旧トークンで参加できなくなる", async () => {
      await service.regenerateInviteToken("camp-1", "user-1");
      await expect(
        service.join("invite-token-1", { userId: "user-2" })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("所有者以外はForbiddenErrorを投げる", async () => {
      await expect(
        service.regenerateInviteToken("camp-1", "user-2")
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
