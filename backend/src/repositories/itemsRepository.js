import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { TABLE_NAMES } from "../lib/dynamoClient.js";

// documentClientを注入する関数ファクトリにすることで、本番はDynamoDBの
// DocumentClient、テストはインメモリのfakeを渡して差し替えられるようにする。
export function createItemsRepository(documentClient) {
  const tableName = TABLE_NAMES.items;

  return {
    async list() {
      const result = await documentClient.send(
        new ScanCommand({ TableName: tableName })
      );
      return result.Items || [];
    },

    async get(itemId) {
      const result = await documentClient.send(
        new GetCommand({ TableName: tableName, Key: { itemId } })
      );
      return result.Item || null;
    },

    async put(item) {
      await documentClient.send(
        new PutCommand({ TableName: tableName, Item: item })
      );
      return item;
    },

    async delete(itemId) {
      await documentClient.send(
        new DeleteCommand({ TableName: tableName, Key: { itemId } })
      );
    },
  };
}
