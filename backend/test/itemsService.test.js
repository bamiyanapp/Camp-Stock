import { describe, it, expect, beforeEach } from "vitest";
import { createItemsService } from "../src/services/itemsService.js";
import { createInMemoryItemsRepository } from "./helpers/inMemoryRepositories.js";

describe("itemsService", () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = createInMemoryItemsRepository();
    service = createItemsService(repository);
  });

  it("create: 持ち物マスタを作成する", async () => {
    const item = await service.create({
      name: "テント",
      category: "住",
      vehicleType: "car",
    });
    expect(item.itemId).toBeTruthy();
    expect(item.name).toBe("テント");
    expect(item.vehicleType).toBe("car");
    expect(await service.list()).toEqual([item]);
  });

  it("create: nameが無ければValidationErrorを投げる", async () => {
    await expect(
      service.create({ category: "住", vehicleType: "car" })
    ).rejects.toThrow(/name/);
  });

  it("create: vehicleTypeが不正ならValidationErrorを投げる", async () => {
    await expect(
      service.create({ name: "テント", category: "住", vehicleType: "boat" })
    ).rejects.toThrow(/vehicleType/);
  });

  it("update: 既存の持ち物マスタを更新する", async () => {
    const created = await service.create({
      name: "テント",
      category: "住",
      vehicleType: "car",
    });
    const updated = await service.update(created.itemId, {
      name: "ティピーテント",
      category: "住",
      vehicleType: "both",
    });
    expect(updated.name).toBe("ティピーテント");
    expect(updated.vehicleType).toBe("both");
    expect(updated.createdAt).toBe(created.createdAt);
  });

  it("update: 存在しないitemIdならNotFoundErrorを投げる", async () => {
    await expect(
      service.update("missing", { name: "x", category: "y", vehicleType: "car" })
    ).rejects.toThrow(/not found/);
  });

  it("remove: 持ち物マスタを削除する", async () => {
    const created = await service.create({
      name: "テント",
      category: "住",
      vehicleType: "car",
    });
    await service.remove(created.itemId);
    expect(await service.list()).toEqual([]);
  });

  it("remove: 存在しないitemIdならNotFoundErrorを投げる", async () => {
    await expect(service.remove("missing")).rejects.toThrow(/not found/);
  });
});
