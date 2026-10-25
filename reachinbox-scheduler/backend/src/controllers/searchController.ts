import { Request, Response } from 'express';
import { ElasticsearchService } from '../services/elasticsearchService';

export class SearchController {
  /**
   * Search emails across recipient and subject, filtered by user
   */
  public static async searchEmails(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const query = req.query.q ? String(req.query.q) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const from = Math.max(0, parseInt(String(req.query.from || '0'), 10));
    const size = Math.min(100, Math.max(1, parseInt(String(req.query.size || '20'), 10)));

    const result = await ElasticsearchService.searchEmails({
      userId,
      query,
      status,
      from,
      size
    });

    res.json({
      success: true,
      ...result
    });
  }

  /**
   * Trigger full reindex of PostgreSQL email records into Elasticsearch
   */
  public static async reindex(req: Request, res: Response): Promise<void> {
    const result = await ElasticsearchService.reindexAll();
    res.json({
      success: true,
      message: 'Reindex operation completed',
      ...result
    });
  }
}
