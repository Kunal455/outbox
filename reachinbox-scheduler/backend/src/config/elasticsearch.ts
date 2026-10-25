import { Client } from '@elastic/elasticsearch';
import { env } from './env';
import { logger } from '../utils/logger';

let esClientInstance: Client | null = null;
let isElasticsearchAvailable = false;

export function getElasticsearchClient(): Client {
  if (!esClientInstance) {
    esClientInstance = new Client({
      node: env.ELASTICSEARCH_NODE,
      maxRetries: 3,
      requestTimeout: 5000
    });
  }
  return esClientInstance;
}

export async function checkElasticsearchHealth(): Promise<boolean> {
  try {
    const client = getElasticsearchClient();
    const health = await client.cluster.health();
    isElasticsearchAvailable = true;
    logger.info(`Elasticsearch cluster status: ${health.status}`);
    return true;
  } catch (err: any) {
    isElasticsearchAvailable = false;
    logger.warn(`Elasticsearch unavailable at ${env.ELASTICSEARCH_NODE} (${err.message}). Search will degrade gracefully to DB fallback until Elasticsearch is started.`);
    return false;
  }
}

export function isEsConnected(): boolean {
  return isElasticsearchAvailable;
}
