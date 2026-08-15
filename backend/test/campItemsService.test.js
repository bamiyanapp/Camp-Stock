import { describe, it, expect, beforeEach } from "vitest";
import { createCampItemsService } from "../src/services/campItemsService.js";
import {
  createInMemoryItemsRepository,
  createInMemoryCampsRepository,
  createInMemoryCampItemsRepository,
  createInMemoryCampMembersRepository,
} from "./helpers/inMemoryRepositories.js";

describe("campItemsService", () => {
  let itemsRepository;
  let campsRepository;
  let campItemsRepository;
  let campMembersRepository;
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
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    campsRepository = createInMemoryCampsRepository([carCamp]);

    campItemsRepository = createInMemoryCampItemsRepository();
    campMembersRepository = createInMemoryCampMembersRepository();

    service = createCampItemsService({
      itemsRepository,
      campsRepository,
      campItemsRepository,
      campMembersRepository,
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

  it("listForCamp: 招待されていない他ユーザーはForbiddenErrorを投げる", async () => {
    await expect(service.listForCamp("camp-1", "user-2")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("listForCamp: 参加者（CampMembers）であれば候補一覧を取得できる", async () => {
    await campMembersRepository.put({ campId: "camp-1", userId: "user-2", joinedAt: "2026-01-02T00:00:00.000Z" });
    const result = await service.listForCamp("camp-1", "user-2");
    expect(result.length).toBeGreaterThan(0);
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

  it("setUsed: 招待されていない他ユーザーはForbiddenErrorを投げる", async () => {
    await expect(
      service.setUsed("camp-1", "item-car", true, "user-2")
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("setUsed: 参加者（CampMembers）であれば今回使う選択を操作できる", async () => {
    await campMembersRepository.put({ campId: "camp-1", userId: "user-2", joinedAt: "2026-01-02T00:00:00.000Z" });
    const result = await service.setUsed("camp-1", "item-car", true, "user-2");
    expect(result.used).toBe(true);
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

  it("setPacked: 招待されていない他ユーザーはForbiddenErrorを投げる", async () => {
    await service.setUsed("camp-1", "item-car", true, "user-1");
    await expect(
      service.setPacked("camp-1", "item-car", true, "user-2")
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("setPacked: 参加者（CampMembers）であれば積み込み状態を操作できる", async () => {
    await service.setUsed("camp-1", "item-car", true, "user-1");
    await campMembersRepository.put({ campId: "camp-1", userId: "user-2", joinedAt: "2026-01-02T00:00:00.000Z" });
    const result = await service.setPacked("camp-1", "item-car", true, "user-2");
    expect(result.packed).toBe(true);
  });

  it("seedAllMatchingItems: キャンプの移動手段に対応する持ち物マスタ全件をused: trueにする", async () => {
    await service.seedAllMatchingItems("camp-1");

    const list = await service.listForCamp("camp-1", "user-1");
    const carItemResult = list.find((r) => r.itemId === "item-car");
    const bothItemResult = list.find((r) => r.itemId === "item-both");
    expect(carItemResult.used).toBe(true);
    expect(bothItemResult.used).toBe(true);
  });

  it("seedAllMatchingItems: 対応しない移動手段の持ち物は候補にそもそも出てこない", async () => {
    await service.seedAllMatchingItems("camp-1");

    const list = await service.listForCamp("camp-1", "user-1");
    expect(list.find((r) => r.itemId === "item-bike")).toBeUndefined();
  });

  it("seedAllMatchingItems: packed（積み込み状態）は常にfalseで初期化する", async () => {
    await service.seedAllMatchingItems("camp-1");

    const list = await service.listForCamp("camp-1", "user-1");
    expect(list.every((r) => r.packed === false)).toBe(true);
  });

  it("seedAllMatchingItems: 存在しないcampIdならNotFoundErrorを投げる", async () => {
    await expect(service.seedAllMatchingItems("missing")).rejects.toThrow(/not found/);
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

  describe("setAssignee", () => {
    it("今回使う持ち物に担当者を割り当てる", async () => {
      await service.setUsed("camp-1", "item-car", true, "user-1");
      const result = await service.setAssignee("camp-1", "item-car", "user-1", "user-1");
      expect(result.assignedUserId).toBe("user-1");

      const list = await service.listForCamp("camp-1", "user-1");
      const target = list.find((r) => r.itemId === "item-car");
      expect(target.assignedUserId).toBe("user-1");
    });

    it("nullを指定すると担当者を解除する", async () => {
      await service.setUsed("camp-1", "item-car", true, "user-1");
      await service.setAssignee("camp-1", "item-car", "user-1", "user-1");

      const result = await service.setAssignee("camp-1", "item-car", null, "user-1");
      expect(result.assignedUserId).toBeNull();

      const list = await service.listForCamp("camp-1", "user-1");
      expect(list.find((r) => r.itemId === "item-car").assignedUserId).toBeNull();
    });

    it("参加者は他の参加者を担当者として割り当てられる", async () => {
      await service.setUsed("camp-1", "item-car", true, "user-1");
      await campMembersRepository.put({ campId: "camp-1", userId: "user-2", joinedAt: "2026-01-02T00:00:00.000Z" });

      const result = await service.setAssignee("camp-1", "item-car", "user-2", "user-2");
      expect(result.assignedUserId).toBe("user-2");
    });

    it("今回使う状態でない持ち物に対してはNotFoundErrorを投げる", async () => {
      await expect(
        service.setAssignee("camp-1", "item-car", "user-1", "user-1")
      ).rejects.toThrow(/not marked as used/);
    });

    it("招待されていない他ユーザーはForbiddenErrorを投げる", async () => {
      await service.setUsed("camp-1", "item-car", true, "user-1");
      await expect(
        service.setAssignee("camp-1", "item-car", "user-2", "user-2")
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("積み込み状態は担当者の変更で保持される", async () => {
      await service.setUsed("camp-1", "item-car", true, "user-1");
      await service.setPacked("camp-1", "item-car", true, "user-1");

      const result = await service.setAssignee("camp-1", "item-car", "user-1", "user-1");
      expect(result.packed).toBe(true);
    });
  });

  it("seedAllMatchingItems: 担当者は未割り当て（null）で初期化する", async () => {
    await service.seedAllMatchingItems("camp-1");

    const list = await service.listForCamp("camp-1", "user-1");
    expect(list.every((r) => r.assignedUserId === null)).toBe(true);
  });
});
