import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { QueueService, JobHandler } from './queue.service';

/**
 * Fila baseada em BullMQ + Redis (producao).
 * Ativada com QUEUE_DRIVER=bullmq e um Redis acessivel (ver docker-compose.yml).
 * Ganha de graca: retry com backoff, persistencia e workers separados.
 */
@Injectable()
export class BullQueueService extends QueueService implements OnModuleDestroy {
  private readonly logger = new Logger('Queue(bullmq)');
  private readonly connection: Redis;
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];

  constructor() {
    super();
    this.connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
  }

  private queueFor(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, {
        connection: this.connection as unknown as ConnectionOptions,
      });
      this.queues.set(name, queue);
    }
    return queue;
  }

  register<T>(jobName: string, handler: JobHandler<T>): void {
    const worker = new Worker(
      jobName,
      async (job) => {
        await handler(job.data as T);
      },
      { connection: this.connection as unknown as ConnectionOptions },
    );
    worker.on('failed', (_job, err) =>
      this.logger.error(`Job "${jobName}" falhou: ${err.message}`),
    );
    this.workers.push(worker);
  }

  enqueue<T>(jobName: string, payload: T): void {
    void this.queueFor(jobName).add(jobName, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    await this.connection.quit();
  }
}
