import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { StatusCodes } from 'http-status-codes';

const client = new DynamoDBClient({});

export const handler = async (): Promise<{ statusCode: number; body: string }> => {
  // Query the list of the articles with the PK = 'article'
  const { Items } = await client.send(
    new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: 'article' },
      },
    }),
  );

  if (Items === undefined) {
    return { statusCode: StatusCodes.NOT_FOUND, body: 'No articles found' };
  }

  // map the results (un-marshall the DynamoDB attributes)
  const articles = Items.map(item => ({
    id: item.SK?.S,
    title: item.title?.S,
    author: item.author?.S,
  }));

  // return the list of articles (title, id and author)
  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify({ articles }),
  };
};