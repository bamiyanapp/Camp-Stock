import { getDocumentClient } from "./lib/dynamoClient.js";
import { createItemsRepository } from "./repositories/itemsRepository.js";
import { createCampsRepository } from "./repositories/campsRepository.js";
import { createCampItemsRepository } from "./repositories/campItemsRepository.js";
import { createItemsService } from "./services/itemsService.js";
import { createCampsService } from "./services/campsService.js";
import { createCampItemsService } from "./services/campItemsService.js";
import { createRouter } from "./router.js";
import { buildRoutes } from "./routes/index.js";

function toApiResponse({ statusCode, body }) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: body === null || body === undefined ? "" : JSON.stringify(body),
  };
}

// API Gateway（HTTP API, payload format 2.0）からのイベントをルーティングし、
// 各serviceを実行する。DynamoDBクライアント・repository・serviceの組み立てを
// このファイルに閉じ込め、ビジネスロジック側（services/*）はAWS SDKに依存しない。
export async function handler(event) {
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

  const router = createRouter(
    buildRoutes({ itemsService, campsService, campItemsService })
  );

  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path;

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
    body,
    query: event.queryStringParameters,
  });
  return toApiResponse(result);
}
