import { ElasticsearchService } from '../services/elasticsearchService';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

async function run() {
  logger.info('Executing Elasticsearch reindex script...');
  const result = await ElasticsearchService.reindexAll();
  logger.info('Reindex script finished:', result);
  await prisma.$disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error('Error running reindex script:', err);
  process.exit(1);
});
