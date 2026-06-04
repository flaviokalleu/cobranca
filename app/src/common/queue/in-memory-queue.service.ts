import { Injectable, Logger } from '@nestjs/common';
import { QueueService, JobHandler } from './queue.service';

/**
 * Fila em memoria para desenvolvimento (sem Redis).
 * Processa o job no proximo tick, fora do ciclo da requisicao, como um worker.
 */
@Injectable()
export class InMemoryQueueService extends QueueService {
  private readonly logger = new Logger('Queue(memory)');
  private readonly handlers = new Map<string, JobHandler>();

  register<T>(jobName: string, handler: JobHandler<T>): void {
    this.handlers.set(jobName, handler as JobHandler);
  }

  enqueue<T>(jobName: string, payload: T): void {
    this.logger.log(`enqueue ${jobName}`);
    setImmediate(() => {
      void this.process(jobName, payload);
    });
  }

  private async process<T>(jobName: string, payload: T): Promise<void> {
    const handler = this.handlers.get(jobName);
    if (!handler) {
      this.logger.warn(`Sem handler registrado para o job "${jobName}"`);
      return;
    }
    try {
      await handler(payload);
    } catch (err) {
      this.logger.error(`Job "${jobName}" falhou: ${(err as Error).message}`);
    }
  }
}
