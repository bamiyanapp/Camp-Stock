import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { TABLE_NAMES } from "../lib/dynamoClient.js";

export function createCampItemsRepository(documentClient) {
  const tableName = TABLE_NAMES.campItems;

  return {
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

    async get(campId, itemId) {
      const result = await documentClient.send(
        new GetCommand({ TableName: tableName, Key: { campId, itemId } })
      );
      return result.Item || null;
    },

    async put(campItem) {
      await documentClient.send(
        new PutCommand({ TableName: tableName, Item: campItem })
      );
      return campItem;
    },

    async delete(campId, itemId) {
      await documentClient.send(
        new DeleteCommand({ TableName: tableName, Key: { campId, itemId } })
      );
    },
  };
}
