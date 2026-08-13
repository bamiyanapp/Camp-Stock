// 持ち物マスタの初期データ（items-seed.json）をDynamoDBへ投入するスクリプト。
// 実行にはAWS認証情報とITEMS_TABLE_NAME環境変数（またはinfra/template.yamlの
// 既定テーブル名）が必要。シークレット未設定の環境では実行しない想定で、
// 用意のみ本Issueのスコープとする。
//
// 実行例: ITEMS_TABLE_NAME=camp-stock-items node seed/seed-items.js
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getDocumentClient } from "../src/lib/dynamoClient.js";
import { createItemsRepository } from "../src/repositories/itemsRepository.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const seedPath = join(__dirname, "items-seed.json");
  const seedItems = JSON.parse(await readFile(seedPath, "utf-8"));

  const documentClient = getDocumentClient();
  const itemsRepository = createItemsRepository(documentClient);

  const now = new Date().toISOString();
  let count = 0;
  for (const seedItem of seedItems) {
    await itemsRepository.put({
      ...seedItem,
      createdAt: now,
      updatedAt: now,
    });
    count += 1;
  }

  console.log(`投入完了: ${count}件`);
}

main().catch((error) => {
  console.error("シードデータの投入に失敗しました:", error);
  process.exitCode = 1;
});
