import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { TABLE_NAMES } from "../lib/dynamoClient.js";

export function createCampsRepository(documentClient) {
  const tableName = TABLE_NAMES.camps;

  return {
    async list() {
      const result = await documentClient.send(
        new ScanCommand({ TableName: tableName })
      );
      return result.Items || [];
    },

    async get(campId) {
      const result = await documentClient.send(
        new GetCommand({ TableName: tableName, Key: { campId } })
      );
      return result.Item || null;
    },

    async put(camp) {
      await documentClient.send(
        new PutCommand({ TableName: tableName, Item: camp })
      );
      return camp;
    },

    async delete(campId) {
      await documentClient.send(
        new DeleteCommand({ TableName: tableName, Key: { campId } })
      );
    },
  };
}
