import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ReachInbox database with initial demo data...');

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'evaluator@outboxlabs.com' },
    update: {},
    create: {
      name: 'Outbox Labs Evaluator',
      email: 'evaluator@outboxlabs.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
    }
  });

  // Create primary sender
  const sender1 = await prisma.sender.upsert({
    where: {
      userId_email: {
        userId: user.id,
        email: 'outreach@reachinbox.ai'
      }
    },
    update: {},
    create: {
      userId: user.id,
      name: 'ReachInbox Growth',
      email: 'outreach@reachinbox.ai',
      hourlyLimit: 200,
      minSendIntervalMs: 2000,
      isActive: true
    }
  });

  // Create secondary sender
  const sender2 = await prisma.sender.upsert({
    where: {
      userId_email: {
        userId: user.id,
        email: 'founders@outboxlabs.com'
      }
    },
    update: {},
    create: {
      userId: user.id,
      name: 'Outbox Labs Founders',
      email: 'founders@outboxlabs.com',
      hourlyLimit: 50,
      minSendIntervalMs: 3000,
      isActive: true
    }
  });

  // Create a sample completed campaign with sent records
  const pastStartTime = new Date(Date.now() - 3600000);
  const sampleCampaign1 = await prisma.campaign.create({
    data: {
      userId: user.id,
      subject: 'Welcome to Outbox Labs & ReachInbox 🚀',
      body: 'Hello {{name}},\n\nThank you for checking out our full-stack email job scheduler assignment. Everything is persistent, rate-limited, and testable!\n\nBest,\nThe ReachInbox Team',
      startTime: pastStartTime,
      delayBetweenSendsMs: 2000,
      hourlyLimit: 200,
      status: 'COMPLETED'
    }
  });

  await prisma.emailRecord.createMany({
    data: [
      {
        campaignId: sampleCampaign1.id,
        senderId: sender1.id,
        recipientEmail: 'alex.intern@outboxlabs.com',
        subjectSnapshot: sampleCampaign1.subject,
        bodySnapshot: sampleCampaign1.body,
        status: 'sent',
        scheduledTime: pastStartTime,
        sentTime: new Date(pastStartTime.getTime() + 1500),
        attemptCount: 1,
        providerMessageId: '<mock-ethereal-msg-001@reachinbox.ai>',
        previewUrl: 'https://ethereal.email/message/demo-welcome-preview-1',
        idempotencyKey: crypto.randomUUID()
      },
      {
        campaignId: sampleCampaign1.id,
        senderId: sender1.id,
        recipientEmail: 'engineering-leads@outboxlabs.com',
        subjectSnapshot: sampleCampaign1.subject,
        bodySnapshot: sampleCampaign1.body,
        status: 'sent',
        scheduledTime: new Date(pastStartTime.getTime() + 2000),
        sentTime: new Date(pastStartTime.getTime() + 3200),
        attemptCount: 1,
        providerMessageId: '<mock-ethereal-msg-002@reachinbox.ai>',
        previewUrl: 'https://ethereal.email/message/demo-welcome-preview-2',
        idempotencyKey: crypto.randomUUID()
      }
    ]
  });

  // Create a future scheduled campaign
  const futureStartTime = new Date(Date.now() + 1800000); // 30 mins in future
  const sampleCampaign2 = await prisma.campaign.create({
    data: {
      userId: user.id,
      subject: 'Scheduled Outreach: Product Update v2.0',
      body: 'Hi there,\n\nOur delayed job scheduler ensures that emails are sent with minimum delay intervals and strictly enforced hourly caps.\n\nCheers!',
      startTime: futureStartTime,
      delayBetweenSendsMs: 2000,
      hourlyLimit: 200,
      status: 'SCHEDULED'
    }
  });

  await prisma.emailRecord.createMany({
    data: [
      {
        campaignId: sampleCampaign2.id,
        senderId: sender1.id,
        recipientEmail: 'sarah.lead@innovate.tech',
        subjectSnapshot: sampleCampaign2.subject,
        bodySnapshot: sampleCampaign2.body,
        status: 'scheduled',
        scheduledTime: futureStartTime,
        idempotencyKey: crypto.randomUUID()
      },
      {
        campaignId: sampleCampaign2.id,
        senderId: sender1.id,
        recipientEmail: 'david.tech@startup.io',
        subjectSnapshot: sampleCampaign2.subject,
        bodySnapshot: sampleCampaign2.body,
        status: 'scheduled',
        scheduledTime: new Date(futureStartTime.getTime() + 2000),
        idempotencyKey: crypto.randomUUID()
      }
    ]
  });

  console.log('✅ Seed completed successfully with demo user, senders, and sample email records.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
