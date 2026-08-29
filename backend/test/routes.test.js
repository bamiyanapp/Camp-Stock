import { describe, it, expect } from "vitest";
import { createRouter } from "../src/router.js";
import { buildRoutes } from "../src/routes/index.js";
import { createItemsService } from "../src/services/itemsService.js";
import { createCampsService } from "../src/services/campsService.js";
import { createCampItemsService } from "../src/services/campItemsService.js";
import { createCampMembersService } from "../src/services/campMembersService.js";
import {
  createInMemoryItemsRepository,
  createInMemoryCampsRepository,
  createInMemoryCampItemsRepository,
  createInMemoryCampMembersRepository,
} from "./helpers/inMemoryRepositories.js";

// router + routes + services + インメモリrepositoryを結合した、
// HTTPリクエスト相当の入出力を検証するテスト。テストごとに新しい
// repository/service一式を作る（キャンプの所有者・参加者分離を検証する
// テストが複数あり、状態を共有すると相互に影響するため）。
function setupRoutes({ authService } = {}) {
  const itemsRepository = createInMemoryItemsRepository();
  const campsRepository = createInMemoryCampsRepository();
  const campItemsRepository = createInMemoryCampItemsRepository();
  const campMembersRepository = createInMemoryCampMembersRepository();

  const itemsService = createItemsService(itemsRepository);
  const campsService = createCampsService(campsRepository, campMembersRepository);
  const campItemsService = createCampItemsService({
    itemsRepository,
    campsRepository,
    campItemsRepository,
    campMembersRepository,
  });
  const campMembersService = createCampMembersService({
    campsRepository,
    campMembersRepository,
  });

  return buildRoutes({
    itemsService,
    campsService,
    campItemsService,
    campMembersService,
    authService,
  });
}

describe("routes", () => {
  it("POST /items → GET /items で作成した持ち物マスタが一覧に含まれる", async () => {
    const router = createRouter(setupRoutes());
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
    const authenticatedRouter = createRouter(setupRoutes(), {
      authenticate: async () => ({ userId: "user-1" }),
    });

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
    const router = createRouter(setupRoutes());
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
    const router = createRouter(setupRoutes());
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
    const router = createRouter(setupRoutes());
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
    const router = createRouter(setupRoutes());
    const result = await router.handleRequest({
      method: "GET",
      path: "/camps/missing/items",
      body: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("キャンプは所有ユーザーごとに分離される", async () => {
    let currentUserId;
    const authenticatedRouter = createRouter(setupRoutes(), {
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
    const authenticatedRouter = createRouter(setupRoutes(), {
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

  it("招待リンクで参加すると、参加者もキャンプ一覧・持ち物一覧にアクセスできるようになる", async () => {
    let currentUser;
    const authenticatedRouter = createRouter(setupRoutes(), {
      authenticate: async () => currentUser,
    });

    currentUser = { userId: "user-1", name: "オーナー", email: "owner@example.com" };
    const created = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps",
      headers: {},
      body: { name: "夏キャンプ", vehicleType: "car" },
    });
    const inviteToken = created.body.inviteToken;
    expect(inviteToken).toBeTruthy();

    currentUser = { userId: "user-2", name: "参加者", email: "member@example.com" };
    const joined = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps/join",
      headers: {},
      body: { inviteToken },
    });
    expect(joined.statusCode).toBe(200);
    expect(joined.body.campId).toBe(created.body.campId);

    const listAsMember = await authenticatedRouter.handleRequest({
      method: "GET",
      path: "/camps",
      headers: {},
      body: {},
    });
    expect(listAsMember.body).toHaveLength(1);

    const itemsAsMember = await authenticatedRouter.handleRequest({
      method: "GET",
      path: `/camps/${created.body.campId}/items`,
      headers: {},
      body: {},
    });
    expect(itemsAsMember.statusCode).toBe(200);

    const membersList = await authenticatedRouter.handleRequest({
      method: "GET",
      path: `/camps/${created.body.campId}/members`,
      headers: {},
      body: {},
    });
    expect(membersList.body).toHaveLength(2);
    expect(membersList.body.map((m) => m.role).sort()).toEqual(["member", "owner"]);
  });

  it("参加者はキャンプ設定の更新・削除・招待リンクの再発行はできない", async () => {
    let currentUser;
    const authenticatedRouter = createRouter(setupRoutes(), {
      authenticate: async () => currentUser,
    });

    currentUser = { userId: "user-1", name: "オーナー" };
    const created = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps",
      headers: {},
      body: { name: "夏キャンプ", vehicleType: "car" },
    });
    await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps/join",
      headers: {},
      body: { inviteToken: created.body.inviteToken },
    });

    currentUser = { userId: "user-2", name: "参加者" };
    await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps/join",
      headers: {},
      body: { inviteToken: created.body.inviteToken },
    });

    const updateAsMember = await authenticatedRouter.handleRequest({
      method: "PUT",
      path: `/camps/${created.body.campId}`,
      headers: {},
      body: { name: "改変", vehicleType: "car" },
    });
    expect(updateAsMember.statusCode).toBe(403);

    const deleteAsMember = await authenticatedRouter.handleRequest({
      method: "DELETE",
      path: `/camps/${created.body.campId}`,
      headers: {},
      body: {},
    });
    expect(deleteAsMember.statusCode).toBe(403);

    const inviteAsMember = await authenticatedRouter.handleRequest({
      method: "POST",
      path: `/camps/${created.body.campId}/invite-token`,
      headers: {},
      body: {},
    });
    expect(inviteAsMember.statusCode).toBe(403);
  });

  it("存在しない招待トークンでの参加はNotFoundErrorを返す", async () => {
    const authenticatedRouter = createRouter(setupRoutes(), {
      authenticate: async () => ({ userId: "user-1" }),
    });
    const result = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps/join",
      headers: {},
      body: { inviteToken: "missing-token" },
    });
    expect(result.statusCode).toBe(404);
  });

  it("PUT .../items/{itemId} にassignedUserIdを指定すると担当者を割り当てられる", async () => {
    let currentUser;
    const authenticatedRouter = createRouter(setupRoutes(), {
      authenticate: async () => currentUser,
    });

    currentUser = { userId: "user-1", name: "オーナー" };
    const item = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/items",
      headers: {},
      body: { name: "テント", category: "住", vehicleType: "car" },
    });
    const camp = await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps",
      headers: {},
      body: { name: "夏キャンプ", vehicleType: "car" },
    });
    await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps/join",
      headers: {},
      body: { inviteToken: camp.body.inviteToken },
    });

    currentUser = { userId: "user-2", name: "参加者" };
    await authenticatedRouter.handleRequest({
      method: "POST",
      path: "/camps/join",
      headers: {},
      body: { inviteToken: camp.body.inviteToken },
    });

    const assigned = await authenticatedRouter.handleRequest({
      method: "PUT",
      path: `/camps/${camp.body.campId}/items/${item.body.itemId}`,
      headers: {},
      body: { assignedUserId: "user-2" },
    });
    expect(assigned.statusCode).toBe(200);
    expect(assigned.body.assignedUserId).toBe("user-2");

    const candidates = await authenticatedRouter.handleRequest({
      method: "GET",
      path: `/camps/${camp.body.campId}/items`,
      headers: {},
      body: {},
    });
    expect(candidates.body.find((c) => c.itemId === item.body.itemId).assignedUserId).toBe(
      "user-2"
    );

    const unassigned = await authenticatedRouter.handleRequest({
      method: "PUT",
      path: `/camps/${camp.body.campId}/items/${item.body.itemId}`,
      headers: {},
      body: { assignedUserId: null },
    });
    expect(unassigned.body.assignedUserId).toBeNull();
  });
});

describe("POST /auth/session", () => {
  it("skipAuthのため未認証（authenticate未設定）でもauthServiceを経由してセッショントークンを発行する", async () => {
    const authService = {
      issueSessionFromGoogleIdToken: async (googleIdToken) => ({
        sessionToken: `session-for-${googleIdToken}`,
        user: { userId: "user-1", email: "user@example.com" },
      }),
    };
    // authenticateを設定していても、skipAuth: trueのルートでは呼ばれないことを
    // このfakeが例外を投げることで確認する
    const router = createRouter(setupRoutes({ authService }), {
      authenticate: async () => {
        throw new Error("skipAuthのルートでauthenticateが呼ばれてはいけない");
      },
    });

    const result = await router.handleRequest({
      method: "POST",
      path: "/auth/session",
      headers: { authorization: "Bearer google-id-token" },
      body: {},
    });
    expect(result).toEqual({
      statusCode: 200,
      body: {
        sessionToken: "session-for-google-id-token",
        user: { userId: "user-1", email: "user@example.com" },
      },
    });
  });

  it("Authorizationヘッダーが無ければ401を返す", async () => {
    const router = createRouter(setupRoutes({ authService: {} }));
    const result = await router.handleRequest({
      method: "POST",
      path: "/auth/session",
      headers: {},
      body: {},
    });
    expect(result.statusCode).toBe(401);
  });
});
