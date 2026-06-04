import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { InMemoryQueueService } from './in-memory-queue.service';
import { BullQueueService } from './bull-queue.service';

// Troca a implementacao por variavel de ambiente, sem tocar no negocio.
const QueueImpl =
  process.env.QUEUE_DRIVER === 'bullmq' ? BullQueueService : InMemoryQueueService;

@Global()
@Module({
  providers: [{ provide: QueueService, useClass: QueueImpl }],
  exports: [QueueService],
})
export class QueueModule {}
