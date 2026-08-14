import { describe, it, expect, beforeEach } from "vitest";
import { createCampsService } from "../src/services/campsService.js";
import { createInMemoryCampsRepository } from "./helpers/inMemoryRepositories.js";

describe("campsService", () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = createInMemoryCampsRepository();
    service = createCampsService(repository);
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
});
