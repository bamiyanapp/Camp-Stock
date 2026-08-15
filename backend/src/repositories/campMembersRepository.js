import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { TABLE_NAMES } from "../lib/dynamoClient.js";

export function createCampMembersRepository(documentClient) {
  const tableName = TABLE_NAMES.campMembers;

  return {
    // 招待トークンでの参加受付時、どのキャンプに既に参加済みかを横断的に
    // 確認する必要があるためScanで全件取得する（既存のcampsRepository.list()と
    // 同様の設計方針。アプリの想定規模ではテーブル全件Scanで十分）。
    async list() {
      const result = await documentClient.send(
        new ScanCommand({ TableName: tableName })
      );
      return result.Items || [];
    },

    async listByCamp(campId) {
      const result = await documentClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "campId = :campId",
          ExpressionAttributeValues: { ":campId": campId },
        })
      );
      return result.Items || [];
    },

    async get(campId, userId) {
      const result = await documentClient.send(
        new GetCommand({ TableName: tableName, Key: { campId, userId } })
      );
      return result.Item || null;
    },

    async put(member) {
      await documentClient.send(
        new PutCommand({ TableName: tableName, Item: member })
      );
      return member;
    },

    async delete(campId, userId) {
      await documentClient.send(
        new DeleteCommand({ TableName: tableName, Key: { campId, userId } })
      );
    },
  };
}
