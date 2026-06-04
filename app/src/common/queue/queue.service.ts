export type JobHandler<T = unknown> = (payload: T) => Promise<void>;

/**
 * Contrato de fila assincrona. O codigo de negocio depende SO desta abstracao.
 * Implementacoes: InMemoryQueueService (dev) e BullQueueService (BullMQ/Redis, producao).
 * Escolhida por env QUEUE_DRIVER — ver queue.module.ts.
 */
export abstract class QueueService {
  abstract register<T>(jobName: string, handler: JobHandler<T>): void;
  abstract enqueue<T>(jobName: string, payload: T): void;
}
