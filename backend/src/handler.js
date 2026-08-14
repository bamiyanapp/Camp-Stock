import { getDocumentClient } from "./lib/dynamoClient.js";
import { createItemsRepository } from "./repositories/itemsRepository.js";
import { createCampsRepository } from "./repositories/campsRepository.js";
import { createCampItemsRepository } from "./repositories/campItemsRepository.js";
import { createItemsService } from "./services/itemsService.js";
import { createCampsService } from "./services/campsService.js";
import { createCampItemsService } from "./services/campItemsService.js";
import { createRouter } from "./router.js";
import { buildRoutes } from "./routes/index.js";
import { createGoogleAuthenticator } from "./lib/googleAuth.js";

function toApiResponse({ statusCode, body }) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: body === null || body === undefined ? "" : JSON.stringify(body),
  };
}

// API Gateway（HTTP API, payload format 2.0）からのイベントをルーティングし、
// 各serviceを実行する。DynamoDBクライアント・repository・serviceの組み立てを
// このファイルに閉じ込め、ビジネスロジック側（services/*）はAWS SDKに依存しない。
// CORSはAPI Gateway側のCorsConfiguration（infra/template.yaml）が処理するため、
// レスポンスヘッダーにAccess-Control-Allow-Originは含めない。
export async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path;

  // ANY /{proxy+}はOPTIONSメソッドにも一致するため、HTTP APIのCorsConfiguration
  // による自動プリフライト応答（Lambda統合を経由しない仕組み）が働かず、
  // プリフライトリクエストがLambdaまで転送されてしまう。router.jsにOPTIONS用の
  // ルートは存在しないため、ここで先に204を返す（CORSヘッダー自体はAPI Gateway側が
  // レスポンスに付与する）。
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: {}, body: "" };
  }

  const documentClient = getDocumentClient();
  const itemsRepository = createItemsRepository(documentClient);
  const campsRepository = createCampsRepository(documentClient);
  const campItemsRepository = createCampItemsRepository(documentClient);

  const itemsService = createItemsService(itemsRepository);
  const campsService = createCampsService(campsRepository);
  const campItemsService = createCampItemsService({
    campsRepository,
    itemsRepository,
    campItemsRepository,
  });

  const authenticate = createGoogleAuthenticator({
    clientId: process.env.GOOGLE_CLIENT_ID,
  });

  const router = createRouter(
    buildRoutes({ itemsService, campsService, campItemsService }),
    { authenticate }
  );

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return toApiResponse({
      statusCode: 400,
      body: { message: "invalid JSON body" },
    });
  }

  const result = await router.handleRequest({
    method,
    path,
    headers: event.headers,
    body,
    query: event.queryStringParameters,
  });
  return toApiResponse(result);
}
