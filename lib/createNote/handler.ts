import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

const client = new DynamoDBClient({});

export const handler = async (event: {
  body: string;
  pathParameters: { userId?: string };
}): Promise<{ statusCode: number; body: string }> => {
  const { content } = JSON.parse(event.body) as { content?: string };
  const { userId } = event.pathParameters ?? {};

  if (userId === undefined || content === undefined) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      body: ReasonPhrases.BAD_REQUEST,
    };
  }

  const noteId = uuidv4();

  await client.send(
    new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        PK: { S: userId },
        SK: { S: noteId },
        noteContent: { S: content },
      },
    })
  );
  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify({ noteId }),
  };
};
