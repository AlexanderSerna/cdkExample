import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
const client = new DynamoDBClient({});

export const handler = async (event: {
  pathParameters: { userId?: string; id?: string };
}): Promise<{ statusCode: number; body: string }> => {
  const { userId, id: noteId } = event.pathParameters ?? {};

  if (userId === undefined || noteId === undefined) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      body: ReasonPhrases.BAD_REQUEST,
    };
  }

  const { Item } = await client.send(
    new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: { S: userId },
        SK: { S: noteId },
      },
    })
  );

  if (Item === undefined) {
    return {
      statusCode: StatusCodes.NOT_FOUND,
      body: ReasonPhrases.NOT_FOUND,
    };
  }

  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify({
      id: noteId,
      content: Item.noteContent.S,
    }),
  };
};
