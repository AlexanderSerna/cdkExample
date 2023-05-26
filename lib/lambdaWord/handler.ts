type RequestBody = { pathParameters: { word: string } };
export const handler = async ({
  pathParameters: { word },
}: RequestBody): Promise<{ statusCode: number; body?: string }> => {
  return Promise.resolve({ statusCode: 200, body: word });
};
