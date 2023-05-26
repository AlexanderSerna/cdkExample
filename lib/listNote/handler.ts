import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
const client = new DynamoDBClient({});

export const handler = async (event: {
  pathParameters: { userId?: string };
}): Promise<{ statusCode: number; body: string }> => {
  const { userId } = event.pathParameters ?? {};

  const { Items } = await client.send(
    new QueryCommand({
      KeyConditionExpression: "PK = :userId",
      ExpressionAttributeValues: {
        ":userId": { S: userId },
      },
      TableName: process.env.TABLE_NAME,
    })
  );

  if (!Items) {
    return {
      statusCode: StatusCodes.NOT_FOUND,
      body: ReasonPhrases.NOT_FOUND,
    };
  }

  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify({
      notes: Items,
    }),
  };
};
