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
});
