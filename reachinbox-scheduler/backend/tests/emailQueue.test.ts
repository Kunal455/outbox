import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enqueueEmailJob, emailQueue } from '../src/queues/emailQueue';

describe('BullMQ Delayed Email Queue', () => {
  const sampleData = {
    emailRecordId: 'rec-12345',
    campaignId: 'camp-67890',
    senderId: 'send-11111',
    recipientEmail: 'lead@example.com',
    subject: 'Delayed Email Test',
    body: 'Hello test',
    scheduledTime: new Date(Date.now() + 60000).toISOString(),
    idempotencyKey: 'idemp-key-unique'
  };

  let addSpy: any;

  beforeEach(() => {
    addSpy = vi.spyOn(emailQueue, 'add').mockImplementation(async (name, data, opts) => {
      return { id: opts?.jobId || 'email-rec-12345' } as any;
    });
  });

  afterEach(() => {
    if (addSpy) addSpy.mockRestore();
  });

  it('calculates delay accurately and enqueues with stable job identifier', async () => {
    const targetTime = new Date(Date.now() + 5000); // 5 seconds in future
    const jobId = await enqueueEmailJob(sampleData, targetTime);

    expect(jobId).toBe('email-rec-12345');
    expect(addSpy).toHaveBeenCalledWith(
      'send-email',
      sampleData,
      expect.objectContaining({
        jobId: 'email-rec-12345',
        delay: expect.any(Number)
      })
    );

    const callArgs = addSpy.mock.calls[0];
    const delayArg = callArgs[2].delay;
    expect(delayArg).toBeGreaterThan(0);
    expect(delayArg).toBeLessThanOrEqual(5050);
  });

  it('uses delay = 0 for scheduled times that are immediate or slightly past', async () => {
    const immediateTime = new Date(Date.now() - 1000);
    const jobId = await enqueueEmailJob(sampleData, immediateTime);

    expect(jobId).toBe('email-rec-12345');
    const callArgs = addSpy.mock.calls[0];
    expect(callArgs[2].delay).toBe(0);
  });
});
