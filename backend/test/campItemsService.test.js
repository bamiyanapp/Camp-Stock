import { describe, it, expect, beforeEach } from "vitest";
import { createCampItemsService } from "../src/services/campItemsService.js";
import {
  createInMemoryItemsRepository,
  createInMemoryCampsRepository,
  createInMemoryCampItemsRepository,
} from "./helpers/inMemoryRepositories.js";

describe("campItemsService", () => {
  let itemsRepository;
  let campsRepository;
  let campItemsRepository;
  let service;
  let carCamp;
  let carItem;
  let bikeItem;
  let bothItem;

  beforeEach(async () => {
    carItem = {
      itemId: "item-car",
      name: "テント",
      category: "住",
      vehicleType: "car",
    };
    bikeItem = {
      itemId: "item-bike",
      name: "タンクバッグ",
      category: "携帯品",
      vehicleType: "bike",
    };
    bothItem = {
      itemId: "item-both",
      name: "さいふ",
      category: "携帯品",
      vehicleType: "both",
    };
    itemsRepository = createInMemoryItemsRepository([carItem, bikeItem, bothItem]);

    carCamp = {
      campId: "camp-1",
      name: "夏キャンプ",
      vehicleType: "car",
      ownerUserId: "user-1",
    };
    campsRepository = createInMemoryCampsRepository([carCamp]);

    campItemsRepository = createInMemoryCampItemsRepository();

    service = createCampItemsService({
      itemsRepository,
      campsRepository,
      campItemsRepository,
    });
  });

  it("listForCamp: キャンプの移動手段に対応する持ち物のみを候補として返す", async () => {
    const result = await service.listForCamp("camp-1", "user-1");
    const itemIds = result.map((r) => r.itemId).sort();
    expect(itemIds).toEqual(["item-both", "item-car"]);
    expect(result.every((r) => r.used === false && r.packed === false)).toBe(true);
  });

  it("listForCamp: 存在しないcampIdならNotFoundErrorを投げる", async () => {
    await expect(service.listForCamp("missing", "user-1")).rejects.toThrow(/not found/);
  });

  it("listForCamp: 他ユーザーが所有するキャンプはForbiddenErrorを投げる", async () => {
    await expect(service.listForCamp("camp-1", "user-2")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("setUsed(true): 持ち物を今回使うものとして選択する", async () => {
    const result = await service.setUsed("camp-1", "item-car", true, "user-1");
    expect(result.used).toBe(true);
    expect(result.packed).toBe(false);

    const list = await service.listForCamp("camp-1", "user-1");
    const target = list.find((r) => r.itemId === "item-car");
    expect(target.used).toBe(true);
  });

  it("setUsed: 対応しない移動手段のitemIdでも例外を投げない（マスタに存在すれば選択可能）", async () => {
    const result = await service.setUsed("camp-1", "item-bike", true, "user-1");
    expect(result.used).toBe(true);
  });

  it("setUsed: 存在しないitemIdならNotFoundErrorを投げる", async () => {
    await expect(
      service.setUsed("camp-1", "missing", true, "user-1")
    ).rejects.toThrow(/not found/);
  });

  it("setUsed: 他ユーザーが所有するキャンプはForbiddenErrorを投げる", async () => {
    await expect(
      service.setUsed("camp-1", "item-car", true, "user-2")
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("setPacked: 使用中の持ち物の積み込み状態を更新する", async () => {
    await service.setUsed("camp-1", "item-car", true, "user-1");
    const result = await service.setPacked("camp-1", "item-car", true, "user-1");
    expect(result.packed).toBe(true);

    const list = await service.listForCamp("camp-1", "user-1");
    const target = list.find((r) => r.itemId === "item-car");
    expect(target.packed).toBe(true);
  });

  it("setPacked: 使用中でない持ち物に対してはNotFoundErrorを投げる", async () => {
    await expect(
      service.setPacked("camp-1", "item-car", true, "user-1")
    ).rejects.toThrow(/not marked as used/);
  });

  it("setPacked: 他ユーザーが所有するキャンプはForbiddenErrorを投げる", async () => {
    await service.setUsed("camp-1", "item-car", true, "user-1");
    await expect(
      service.setPacked("camp-1", "item-car", true, "user-2")
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("setUsed(false): 使用を解除すると積み込み状態もリセットされる", async () => {
    await service.setUsed("camp-1", "item-car", true, "user-1");
    await service.setPacked("camp-1", "item-car", true, "user-1");

    const result = await service.setUsed("camp-1", "item-car", false, "user-1");
    expect(result.used).toBe(false);
    expect(result.packed).toBe(false);

    const list = await service.listForCamp("camp-1", "user-1");
    const target = list.find((r) => r.itemId === "item-car");
    expect(target.used).toBe(false);
    expect(target.packed).toBe(false);
  });
});
