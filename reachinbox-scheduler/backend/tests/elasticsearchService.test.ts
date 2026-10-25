import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockEsClient = {
  indices: {
    exists: vi.fn().mockResolvedValue(true),
    create: vi.fn()
  },
  index: vi.fn().mockResolvedValue({ result: 'created' }),
  update: vi.fn().mockResolvedValue({ result: 'updated' }),
  search: vi.fn()
};

vi.mock('../src/config/elasticsearch', () => ({
  getElasticsearchClient: vi.fn(() => mockEsClient),
  isEsConnected: vi.fn().mockReturnValue(true)
}));

vi.mock('../src/config/prisma', () => ({
  prisma: {
    emailRecord: {
      count: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

import { ElasticsearchService } from '../src/services/elasticsearchService';
import { getElasticsearchClient } from '../src/config/elasticsearch';
import { prisma } from '../src/config/prisma';

describe('Elasticsearch Service & Fault-Tolerant Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getElasticsearchClient as any).mockReturnValue(mockEsClient);
  });

  it('indexes an email document without throwing if successful', async () => {
    const doc = {
      id: 'email-1',
      userId: 'user-1',
      campaignId: 'camp-1',
      senderId: 'send-1',
      recipientEmail: 'client@example.com',
      subject: 'Interview Assignment',
      status: 'scheduled' as const,
      scheduledTime: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const success = await ElasticsearchService.indexEmail(doc);
    expect(success).toBe(true);
    expect(mockEsClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'email-1',
        document: doc
      })
    );
  });

  it('handles Elasticsearch failures gracefully without losing data or throwing', async () => {
    mockEsClient.index.mockRejectedValueOnce(new Error('Elasticsearch node connection timeout'));

    const doc = {
      id: 'email-2',
      userId: 'user-1',
      campaignId: 'camp-1',
      senderId: 'send-1',
      recipientEmail: 'client2@example.com',
      subject: 'Fault Tolerance Test',
      status: 'scheduled' as const,
      scheduledTime: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const success = await ElasticsearchService.indexEmail(doc);
    expect(success).toBe(false);
  });

  it('searches emails scoped to the authenticated user using Elasticsearch query', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _source: {
              id: 'email-1',
              userId: 'user-1',
              recipientEmail: 'client@example.com',
              subject: 'Interview Assignment',
              status: 'scheduled'
            }
          }
        ]
      }
    });

    const result = await ElasticsearchService.searchEmails({
      userId: 'user-1',
      query: 'client@example.com'
    });

    expect(result.total).toBe(1);
    expect(result.hits[0].recipientEmail).toBe('client@example.com');
    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            must: expect.arrayContaining([
              { term: { userId: 'user-1' } }
            ])
          }
        }
      })
    );
  });

  it('falls back to PostgreSQL query when Elasticsearch cluster is temporarily down', async () => {
    mockEsClient.search.mockRejectedValueOnce(new Error('Cluster down'));

    (prisma.emailRecord.count as any).mockResolvedValue(1);
    (prisma.emailRecord.findMany as any).mockResolvedValue([
      {
        id: 'email-fallback-1',
        campaignId: 'camp-1',
        senderId: 'send-1',
        recipientEmail: 'fallback@example.com',
        subjectSnapshot: 'DB Fallback Search',
        status: 'sent',
        scheduledTime: new Date(),
        sentTime: new Date(),
        createdAt: new Date(),
        campaign: { userId: 'user-1' }
      }
    ]);

    const result = await ElasticsearchService.searchEmails({
      userId: 'user-1',
      query: 'fallback'
    });

    expect(result.total).toBe(1);
    expect(result.hits[0].recipientEmail).toBe('fallback@example.com');
    expect(prisma.emailRecord.findMany).toHaveBeenCalled();
  });
});
