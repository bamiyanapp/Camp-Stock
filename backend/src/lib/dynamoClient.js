import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let cachedClient;

// Lambda実行環境内でコールドスタートごとに1回だけ生成し、以降の呼び出しで使い回す。
export function getDocumentClient() {
  if (!cachedClient) {
    const client = new DynamoDBClient({});
    cachedClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return cachedClient;
}

export const TABLE_NAMES = {
  items: process.env.ITEMS_TABLE_NAME || "camp-stock-items",
  camps: process.env.CAMPS_TABLE_NAME || "camp-stock-camps",
  campItems: process.env.CAMP_ITEMS_TABLE_NAME || "camp-stock-camp-items",
};
