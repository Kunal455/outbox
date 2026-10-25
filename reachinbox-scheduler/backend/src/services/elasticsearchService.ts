import { getElasticsearchClient, isEsConnected } from '../config/elasticsearch';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ElasticsearchEmailDocument, EmailStatus } from '../types';

export class ElasticsearchService {
  private static indexInitialized = false;

  /**
   * Ensure index exists with appropriate mapping
   */
  public static async ensureIndex(): Promise<void> {
    if (this.indexInitialized) return;

    try {
      const client = getElasticsearchClient();
      const exists = await client.indices.exists({ index: env.ELASTICSEARCH_INDEX });

      if (!exists) {
        logger.info(`Creating Elasticsearch index "${env.ELASTICSEARCH_INDEX}" with mappings...`);
        await client.indices.create({
          index: env.ELASTICSEARCH_INDEX,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              campaignId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              recipientEmail: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              subject: {
                type: 'text',
                analyzer: 'standard'
              },
              status: { type: 'keyword' },
              scheduledTime: { type: 'date' },
              sentTime: { type: 'date' },
              createdAt: { type: 'date' }
            }
          }
        });
        logger.info(`Elasticsearch index "${env.ELASTICSEARCH_INDEX}" created successfully.`);
      }
      this.indexInitialized = true;
    } catch (err: any) {
      logger.warn(`Elasticsearch index verification notice: ${err.message}`);
    }
  }

  /**
   * Index or update an email document in Elasticsearch
   */
  public static async indexEmail(doc: ElasticsearchEmailDocument): Promise<boolean> {
    try {
      await this.ensureIndex();
      const client = getElasticsearchClient();
      await client.index({
        index: env.ELASTICSEARCH_INDEX,
        id: doc.id,
        document: doc
      });
      return true;
    } catch (err: any) {
      // Do not crash or block PostgreSQL persistence
      logger.warn(`Elasticsearch indexing failed for document ${doc.id}: ${err.message}. PostgreSQL remains the source of truth.`);
      return false;
    }
  }

  /**
   * Update status of an existing indexed email document
   */
  public static async updateEmailStatus(
    emailRecordId: string,
    status: EmailStatus,
    sentTime?: Date | null
  ): Promise<boolean> {
    try {
      await this.ensureIndex();
      const client = getElasticsearchClient();
      await client.update({
        index: env.ELASTICSEARCH_INDEX,
        id: emailRecordId,
        doc: {
          status,
          ...(sentTime ? { sentTime: sentTime.toISOString() } : {})
        }
      });
      return true;
    } catch (err: any) {
      logger.warn(`Elasticsearch status update failed for ${emailRecordId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Search emails scoped to the authenticated user
   */
  public static async searchEmails(params: {
    userId: string;
    query?: string;
    status?: string;
    from?: number;
    size?: number;
  }): Promise<{ total: number; hits: ElasticsearchEmailDocument[] }> {
    const from = params.from || 0;
    const size = params.size || 20;

    // Check if Elasticsearch is responsive
    try {
      await this.ensureIndex();
      const client = getElasticsearchClient();

      const mustClauses: any[] = [
        { term: { userId: params.userId } }
      ];

      if (params.status && params.status !== 'all') {
        mustClauses.push({ term: { status: params.status } });
      }

      if (params.query && params.query.trim()) {
        mustClauses.push({
          multi_match: {
            query: params.query.trim(),
            fields: ['recipientEmail^3', 'recipientEmail.keyword^4', 'subject^2'],
            fuzziness: 'AUTO'
          }
        });
      }

      const response = await client.search<ElasticsearchEmailDocument>({
        index: env.ELASTICSEARCH_INDEX,
        from,
        size,
        query: {
          bool: {
            must: mustClauses
          }
        },
        sort: [
          { scheduledTime: { order: 'desc' } }
        ]
      });

      const total = typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total?.value || 0);

      const hits = response.hits.hits.map(hit => hit._source as ElasticsearchEmailDocument);

      return { total, hits };
    } catch (err: any) {
      logger.warn(`Elasticsearch search unavailable (${err.message}). Falling back to PostgreSQL search.`);

      // Graceful fallback to PostgreSQL search
      const whereClause: any = {
        campaign: { userId: params.userId }
      };

      if (params.status && params.status !== 'all') {
        whereClause.status = params.status;
      }

      if (params.query && params.query.trim()) {
        whereClause.OR = [
          { recipientEmail: { contains: params.query.trim(), mode: 'insensitive' } },
          { subjectSnapshot: { contains: params.query.trim(), mode: 'insensitive' } }
        ];
      }

      const [total, records] = await Promise.all([
        prisma.emailRecord.count({ where: whereClause }),
        prisma.emailRecord.findMany({
          where: whereClause,
          skip: from,
          take: size,
          orderBy: { scheduledTime: 'desc' },
          include: { campaign: true }
        })
      ]);

      const hits: ElasticsearchEmailDocument[] = records.map(r => ({
        id: r.id,
        userId: r.campaign.userId,
        campaignId: r.campaignId,
        senderId: r.senderId,
        recipientEmail: r.recipientEmail,
        subject: r.subjectSnapshot,
        status: r.status as EmailStatus,
        scheduledTime: r.scheduledTime.toISOString(),
        sentTime: r.sentTime ? r.sentTime.toISOString() : null,
        createdAt: r.createdAt.toISOString()
      }));

      return { total, hits };
    }
  }

  /**
   * Reindex all email records from PostgreSQL into Elasticsearch
   */
  public static async reindexAll(): Promise<{ indexedCount: number; errors: number }> {
    logger.info('Starting full Elasticsearch reindex from PostgreSQL...');
    await this.ensureIndex();

    const client = getElasticsearchClient();
    const emails = await prisma.emailRecord.findMany({
      include: { campaign: true }
    });

    let indexedCount = 0;
    let errors = 0;

    for (const record of emails) {
      try {
        await client.index({
          index: env.ELASTICSEARCH_INDEX,
          id: record.id,
          document: {
            id: record.id,
            userId: record.campaign.userId,
            campaignId: record.campaignId,
            senderId: record.senderId,
            recipientEmail: record.recipientEmail,
            subject: record.subjectSnapshot,
            status: record.status as EmailStatus,
            scheduledTime: record.scheduledTime.toISOString(),
            sentTime: record.sentTime ? record.sentTime.toISOString() : null,
            createdAt: record.createdAt.toISOString()
          }
        });
        indexedCount++;
      } catch (err: any) {
        errors++;
      }
    }

    logger.info(`Full reindex finished. Successfully indexed: ${indexedCount}, Errors: ${errors}`);
    return { indexedCount, errors };
  }
}
