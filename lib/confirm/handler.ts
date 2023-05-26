import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { StatusCodes } from 'http-status-codes';

const client = new CognitoIdentityProviderClient({});

export const handler = async (event: { body: string }): Promise<{ statusCode: number; body: string }> => {
  const { username, code } = JSON.parse(event.body) as { username?: string; code?: string };

  if (username === undefined || code === undefined) {
    return Promise.resolve({ statusCode: StatusCodes.BAD_REQUEST, body: 'Missing username or confirmation code' });
  }

  const userPoolClientId = process.env.USER_POOL_CLIENT_ID;

  await client.send(
    new ConfirmSignUpCommand({
      ClientId: userPoolClientId,
      Username: username,
      ConfirmationCode: code,
    }),
  );

  return { statusCode: StatusCodes.OK, body: 'User confirmed' };
};