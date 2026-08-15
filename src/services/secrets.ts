import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { config } from '../config/env';

let client: SecretsManagerClient | null = null;

export async function fetchSecret(secretId: string): Promise<Record<string, string> | null> {
  if (!client) {
    client = new SecretsManagerClient({
      endpoint: config.aws.endpoint,
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      }
    });
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await client!.send(command);
    
    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    }
    return null;
  } catch (error) {
    console.error(`[SecretsManager] Error fetching secret ${secretId}:`, error);
    return null;
  }
}
