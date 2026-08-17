import { describe, it, expect, beforeEach } from "vitest";
import { createCampsService } from "../src/services/campsService.js";
import {
  createInMemoryCampsRepository,
  createInMemoryCampMembersRepository,
} from "./helpers/inMemoryRepositories.js";

describe("campsService", () => {
  let repository;
  let campMembersRepository;
  let service;

  beforeEach(() => {
    repository = createInMemoryCampsRepository();
    campMembersRepository = createInMemoryCampMembersRepository();
    service = createCampsService(repository, campMembersRepository);
  });

  it("create: キャンプを作成する", async () => {
    const camp = await service.create({ name: "夏キャンプ", vehicleType: "car" });
    expect(camp.campId).toBeTruthy();
    expect(camp.vehicleType).toBe("car");
  });

  it("create: vehicleTypeにbothは許可されない（車/バイクのどちらかを選ぶ）", async () => {
    await expect(
      service.create({ name: "夏キャンプ", vehicleType: "both" })
    ).rejects.toThrow(/vehicleType/);
  });

  it("get: 存在しないcampIdならNotFoundErrorを投げる", async () => {
    await expect(service.get("missing")).rejects.toThrow(/not found/);
  });

  it("get: inviteTokenが無い既存キャンプ（招待機能実装前に作成）は自動的に発行・永続化する", async () => {
    // 招待機能実装前に作成されたキャンプを模倣し、inviteTokenを持たない状態でrepositoryへ直接put
    await repository.put({
      campId: "legacy-camp",
      name: "招待機能実装前のキャンプ",
      vehicleType: "car",
      ownerUserId: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const camp = await service.get("legacy-camp", "user-1");
    expect(camp.inviteToken).toBeTruthy();

    // 発行したトークンがrepositoryへ永続化されており、再取得しても同じ値であること
    const reFetched = await service.get("legacy-camp", "user-1");
    expect(reFetched.inviteToken).toBe(camp.inviteToken);
  });

  it("update: キャンプを更新する", async () => {
    const created = await service.create({ name: "夏キャンプ", vehicleType: "car" });
    const updated = await service.update(created.campId, {
      name: "秋キャンプ",
      vehicleType: "bike",
    });
    expect(updated.name).toBe("秋キャンプ");
    expect(updated.vehicleType).toBe("bike");
  });

  it("remove: キャンプを削除する", async () => {
    const created = await service.create({ name: "夏キャンプ", vehicleType: "car" });
    await service.remove(created.campId);
    expect(await service.list()).toEqual([]);
  });

  it("create: ownerUserIdを記録する", async () => {
    const camp = await service.create(
      { name: "夏キャンプ", vehicleType: "car" },
      "user-1"
    );
    expect(camp.ownerUserId).toBe("user-1");
  });

  it("list: リクエストしたユーザーが作成したキャンプのみを返す", async () => {
    await service.create({ name: "user1のキャンプ", vehicleType: "car" }, "user-1");
    await service.create({ name: "user2のキャンプ", vehicleType: "car" }, "user-2");

    const list = await service.list("user-1");
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("user1のキャンプ");
  });

  it("get: 他ユーザーが所有するキャンプはForbiddenErrorを投げる", async () => {
    const created = await service.create(
      { name: "夏キャンプ", vehicleType: "car" },
      "user-1"
    );
    await expect(service.get(created.campId, "user-2")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("update: 他ユーザーが所有するキャンプはForbiddenErrorを投げる", async () => {
    const created = await service.create(
      { name: "夏キャンプ", vehicleType: "car" },
      "user-1"
    );
    await expect(
      service.update(created.campId, { name: "改変", vehicleType: "car" }, "user-2")
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("remove: 他ユーザーが所有するキャンプはForbiddenErrorを投げる", async () => {
    const created = await service.create(
      { name: "夏キャンプ", vehicleType: "car" },
      "user-1"
    );
    await expect(service.remove(created.campId, "user-2")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("create: inviteTokenを自動発行する", async () => {
    const camp = await service.create({ name: "夏キャンプ", vehicleType: "car" }, "user-1");
    expect(camp.inviteToken).toBeTruthy();
  });

  it("create: ownerProfile（name/email/picture）を記録する", async () => {
    const camp = await service.create(
      { name: "夏キャンプ", vehicleType: "car" },
      "user-1",
      { name: "オーナー", email: "owner@example.com", picture: "https://example.com/a.png" }
    );
    expect(camp.ownerName).toBe("オーナー");
    expect(camp.ownerEmail).toBe("owner@example.com");
    expect(camp.ownerPicture).toBe("https://example.com/a.png");
  });

  it("get: 参加者（CampMembers）であれば取得できる", async () => {
    const created = await service.create(
      { name: "夏キャンプ", vehicleType: "car" },
      "user-1"
    );
    await campMembersRepository.put({
      campId: created.campId,
      userId: "user-2",
      joinedAt: "2026-01-02T00:00:00.000Z",
    });
    const camp = await service.get(created.campId, "user-2");
    expect(camp.campId).toBe(created.campId);
  });

  it("list: 参加者（CampMembers）として参加済みのキャンプも一覧に含まれる", async () => {
    const created = await service.create(
      { name: "user1のキャンプ", vehicleType: "car" },
      "user-1"
    );
    await campMembersRepository.put({
      campId: created.campId,
      userId: "user-2",
      joinedAt: "2026-01-02T00:00:00.000Z",
    });

    const list = await service.list("user-2");
    expect(list).toHaveLength(1);
    expect(list[0].campId).toBe(created.campId);
  });

  it("update: 参加者は編集できない（所有者のみ許可）", async () => {
    const created = await service.create(
      { name: "夏キャンプ", vehicleType: "car" },
      "user-1"
    );
    await campMembersRepository.put({
      campId: created.campId,
      userId: "user-2",
      joinedAt: "2026-01-02T00:00:00.000Z",
    });
    await expect(
      service.update(created.campId, { name: "改変", vehicleType: "car" }, "user-2")
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
