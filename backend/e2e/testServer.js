import { createServer } from "node:http";
import {
  createInMemoryItemsRepository,
  createInMemoryCampsRepository,
  createInMemoryCampItemsRepository,
  createInMemoryCampMembersRepository,
} from "../test/helpers/inMemoryRepositories.js";
import { createItemsService } from "../src/services/itemsService.js";
import { createCampsService } from "../src/services/campsService.js";
import { createCampItemsService } from "../src/services/campItemsService.js";
import { createCampMembersService } from "../src/services/campMembersService.js";
import { createRouter } from "../src/router.js";
import { buildRoutes } from "../src/routes/index.js";

// E2Eテストで安定して選択・チェックできるよう、実際の持ち物マスタ（約150件）
// ではなく最小限の固定データを使う。vehicleType: carのキャンプで候補に出る
// ものだけを用意すれば、主要フロー（車キャンプでの選択・積み込み）を検証できる。
const E2E_SEED_ITEMS = [
  { itemId: "e2e-tent", name: "テント", emoji: "⛺", category: "住", vehicleType: "car" },
  { itemId: "e2e-stove", name: "コンロ", emoji: "🔥", category: "調理", vehicleType: "car" },
  { itemId: "e2e-wallet", name: "さいふ", emoji: "👛", category: "携帯品", vehicleType: "both" },
];

// 実際のGoogle検証（署名・audience）は行わず、Authorization: Bearer <トークン>の
// ペイロードをそのまま信頼するfake authenticator。トークンはJWTと同じ形式
// （header.payload.signature、いずれもbase64url）で、frontend側は本物のIDトークンと
// 同様にjwt-decodeでpayloadを表示に使える（frontend/e2e/auth.jsが同じ形式で発行する）。
// backend/src/lib/googleAuth.jsのcreateGoogleAuthenticatorと同じ
// authenticate(headers)インターフェースを実装するのみで、本番コードには
// 一切手を入れない。
function createFakeAuthenticator() {
  return async function authenticate(headers) {
    const authHeader = headers?.authorization || headers?.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const error = new Error("認証情報がありません");
      error.statusCode = 401;
      throw error;
    }
    const token = authHeader.slice("Bearer ".length);
    const [, payloadSegment] = token.split(".");
    let payload;
    try {
      payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf-8"));
    } catch {
      payload = null;
    }
    if (!payload?.sub) {
      const error = new Error("認証情報が無効です");
      error.statusCode = 401;
      throw error;
    }
    return {
      userId: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };
  };
}

// backend/src/handler.jsと同じservice構成を、実AWS（DynamoDB・Google
// verifyIdToken）を一切使わないin-memory repository・fake authenticatorで
// 組み立てる。E2E専用で、本番のhandler.js自体は変更しない。
export function createTestServer() {
  const itemsRepository = createInMemoryItemsRepository(E2E_SEED_ITEMS);
  const campsRepository = createInMemoryCampsRepository();
  const campItemsRepository = createInMemoryCampItemsRepository();
  const campMembersRepository = createInMemoryCampMembersRepository();

  const itemsService = createItemsService(itemsRepository);
  const campsService = createCampsService(campsRepository, campMembersRepository);
  const campItemsService = createCampItemsService({
    campsRepository,
    itemsRepository,
    campItemsRepository,
    campMembersRepository,
  });
  const campMembersService = createCampMembersService({ campsRepository, campMembersRepository });

  const router = createRouter(
    buildRoutes({ itemsService, campsService, campItemsService, campMembersService }),
    { authenticate: createFakeAuthenticator() }
  );

  return createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    // Playwrightのwebserver起動待ち（2xx必須）用。認証を経由しない固定応答。
    if (req.method === "GET" && req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString("utf-8");
    let body = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "invalid JSON body" }));
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const result = await router.handleRequest({
      method: req.method,
      path: url.pathname,
      headers: req.headers,
      body,
      query: Object.fromEntries(url.searchParams),
    });

    res.writeHead(result.statusCode, { "Content-Type": "application/json" });
    res.end(result.body === null || result.body === undefined ? "" : JSON.stringify(result.body));
  });
}

// `node backend/e2e/testServer.js`で単体起動し、疎通確認できるようにする
// （例: curl http://localhost:4000/items）
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 4000;
  createTestServer().listen(port, () => {
    console.log(`E2E test server listening on http://localhost:${port}`);
  });
}
