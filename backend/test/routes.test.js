import { describe, it, expect, beforeEach } from "vitest";
import { createRouter } from "../src/router.js";
import { buildRoutes } from "../src/routes/index.js";
import { createItemsService } from "../src/services/itemsService.js";
import { createCampsService } from "../src/services/campsService.js";
import { createCampItemsService } from "../src/services/campItemsService.js";
import {
  createInMemoryItemsRepository,
  createInMemoryCampsRepository,
  createInMemoryCampItemsRepository,
} from "./helpers/inMemoryRepositories.js";

// router + routes + services + インメモリrepositoryを結合した、
// HTTPリクエスト相当の入出力を検証するテスト。
describe("routes", () => {
  let router;

  beforeEach(() => {
    const itemsRepository = createInMemoryItemsRepository();
    const campsRepository = createInMemoryCampsRepository();
    const campItemsRepository = createInMemoryCampItemsRepository();

    const itemsService = createItemsService(itemsRepository);
    const campsService = createCampsService(campsRepository);
    const campItemsService = createCampItemsService({
      itemsRepository,
      campsRepository,
      campItemsRepository,
    });

    router = createRouter(
      buildRoutes({ itemsService, campsService, campItemsService })
    );
  });

  it("POST /items → GET /items で作成した持ち物マスタが一覧に含まれる", async () => {
    const created = await router.handleRequest({
      method: "POST",
      path: "/items",
      body: { name: "テント", category: "住", vehicleType: "car" },
    });
    expect(created.statusCode).toBe(201);

    const listed = await router.handleRequest({
      method: "GET",
      path: "/items",
      body: {},
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].name).toBe("テント");
  });

  it("POST /items でuser情報がある場合、createdBy/updatedByに記録される", async () => {
    const itemsRepository = createInMemoryItemsRepository();
    const campsRepository = createInMemoryCampsRepository();
    const campItemsRepository = createInMemoryCampItemsRepository();
    const itemsService = createItemsService(itemsRepository);
    const campsService = createCampsService(campsRepository);
    const campItemsService = createCampItemsService({
      itemsRepository,
      campsRepository,
      campItemsRepository,
    });
    const authenticatedRouter = createRouter(
      buildRoutes({ itemsService, campsService, campItemsService }),
      { authenticate: async () => ({ userId: "user-1" }) }
    );

    const created = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/items",
      headers: {},
      body: { name: "テント", category: "住", vehicleType: "car" },
    });
    expect(created.body.createdBy).toBe("user-1");
    expect(created.body.updatedBy).toBe("user-1");
  });

  it("PUT /items/{itemId} で持ち物マスタを更新する", async () => {
    const created = await router.handleRequest({
      method: "POST",
      path: "/items",
      body: { name: "テント", category: "住", vehicleType: "car" },
    });
    const updated = await router.handleRequest({
      method: "PUT",
      path: `/items/${created.body.itemId}`,
      body: { name: "ティピーテント", category: "住", vehicleType: "both" },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.body.name).toBe("ティピーテント");
  });

  it("DELETE /items/{itemId} で持ち物マスタを削除する", async () => {
    const created = await router.handleRequest({
      method: "POST",
      path: "/items",
      body: { name: "テント", category: "住", vehicleType: "car" },
    });
    const deleted = await router.handleRequest({
      method: "DELETE",
      path: `/items/${created.body.itemId}`,
      body: {},
    });
    expect(deleted.statusCode).toBe(204);
  });

  it("キャンプ作成→持ち物選択→積み込みチェックの一連の流れ", async () => {
    const item = await router.handleRequest({
      method: "POST",
      path: "/items",
      body: { name: "テント", category: "住", vehicleType: "car" },
    });
    const camp = await router.handleRequest({
      method: "POST",
      path: "/camps",
      body: { name: "夏キャンプ", vehicleType: "car" },
    });
    expect(camp.statusCode).toBe(201);

    const candidates = await router.handleRequest({
      method: "GET",
      path: `/camps/${camp.body.campId}/items`,
      body: {},
    });
    expect(candidates.body).toHaveLength(1);
    expect(candidates.body[0].used).toBe(true);

    const packedResult = await router.handleRequest({
      method: "PUT",
      path: `/camps/${camp.body.campId}/items/${item.body.itemId}`,
      body: { packed: true },
    });
    expect(packedResult.body.packed).toBe(true);

    const removed = await router.handleRequest({
      method: "DELETE",
      path: `/camps/${camp.body.campId}/items/${item.body.itemId}`,
      body: {},
    });
    expect(removed.statusCode).toBe(204);

    const afterRemoval = await router.handleRequest({
      method: "GET",
      path: `/camps/${camp.body.campId}/items`,
      body: {},
    });
    expect(afterRemoval.body[0].used).toBe(false);

    const reAdded = await router.handleRequest({
      method: "PUT",
      path: `/camps/${camp.body.campId}/items/${item.body.itemId}`,
      body: { used: true },
    });
    expect(reAdded.body.used).toBe(true);
  });

  it("存在しないcampIdへのアクセスは404相当（NotFoundErrorのstatusCode）を返す", async () => {
    const result = await router.handleRequest({
      method: "GET",
      path: "/camps/missing/items",
      body: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("キャンプは所有ユーザーごとに分離される", async () => {
    const itemsRepository = createInMemoryItemsRepository();
    const campsRepository = createInMemoryCampsRepository();
    const campItemsRepository = createInMemoryCampItemsRepository();
    const itemsService = createItemsService(itemsRepository);
    const campsService = createCampsService(campsRepository);
    const campItemsService = createCampItemsService({
      itemsRepository,
      campsRepository,
      campItemsRepository,
    });
    const routes = buildRoutes({ itemsService, campsService, campItemsService });
    let currentUserId;
    const authenticatedRouter = createRouter(routes, {
      authenticate: async () => ({ userId: currentUserId }),
    });

    currentUserId = "user-1";
    const created = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps",
      headers: {},
      body: { name: "user-1のキャンプ", vehicleType: "car" },
    });
    expect(created.body.ownerUserId).toBe("user-1");

    currentUserId = "user-2";
    const listAsUser2 = await authenticatedRouter.handleRequest({
      method: "GET",
      path: "/camps",
      headers: {},
      body: {},
    });
    expect(listAsUser2.body).toEqual([]);

    const getAsUser2 = await authenticatedRouter.handleRequest({
      method: "GET",
      path: `/camps/${created.body.campId}`,
      headers: {},
      body: {},
    });
    expect(getAsUser2.statusCode).toBe(403);

    const deleteAsUser2 = await authenticatedRouter.handleRequest({
      method: "DELETE",
      path: `/camps/${created.body.campId}`,
      headers: {},
      body: {},
    });
    expect(deleteAsUser2.statusCode).toBe(403);

    currentUserId = "user-1";
    const listAsUser1 = await authenticatedRouter.handleRequest({
      method: "GET",
      path: "/camps",
      headers: {},
      body: {},
    });
    expect(listAsUser1.body).toHaveLength(1);
  });

  it("POST /camps: 作成時に移動手段が対応する持ち物マスタ全件を今回使う状態にする", async () => {
    const itemsRepository = createInMemoryItemsRepository();
    const campsRepository = createInMemoryCampsRepository();
    const campItemsRepository = createInMemoryCampItemsRepository();
    const itemsService = createItemsService(itemsRepository);
    const campsService = createCampsService(campsRepository);
    const campItemsService = createCampItemsService({
      itemsRepository,
      campsRepository,
      campItemsRepository,
    });
    const routes = buildRoutes({ itemsService, campsService, campItemsService });
    const authenticatedRouter = createRouter(routes, {
      authenticate: async () => ({ userId: "user-1" }),
    });

    const carItem = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/items",
      headers: {},
      body: { name: "テント", category: "住", vehicleType: "car" },
    });
    const bikeItem = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/items",
      headers: {},
      body: { name: "タンクバッグ", category: "携帯品", vehicleType: "bike" },
    });

    const camp = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps",
      headers: {},
      body: { name: "夏キャンプ", vehicleType: "car" },
    });

    const candidates = await authenticatedRouter.handleRequest({
      method: "GET",
      path: `/camps/${camp.body.campId}/items`,
      headers: {},
      body: {},
    });
    const carCandidate = candidates.body.find((c) => c.itemId === carItem.body.itemId);
    expect(carCandidate.used).toBe(true);
    expect(carCandidate.packed).toBe(false);
    expect(
      candidates.body.find((c) => c.itemId === bikeItem.body.itemId)
    ).toBeUndefined();
  });
});
