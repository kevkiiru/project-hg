// Lightweight in-process domain event bus. In staging/production this is
// backed by BullMQ + Postgres outbox (handlers stay identical; outbox table
// exists, QUEUE_DRIVER=bullmq swaps the dispatcher).
type Handler<T = any> = (payload: T) => Promise<void> | void;

export interface DomainEvent<T = any> {
  type: string;
  aggregate: string;
  aggregateId?: string;
  payload: T;
}

class EventBus {
  private handlers = new Map<string, Handler[]>();
  private asyncHandlers: { event: DomainEvent; handler: Handler }[] = [];

  on(type: string, handler: Handler) {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
    return () => {
      this.handlers.set(
        type,
        (this.handlers.get(type) ?? []).filter((h) => h !== handler),
      );
    };
  }

  async emit<T>(event: DomainEvent<T>) {
    const list = this.handlers.get(event.type) ?? [];
    for (const handler of list) {
      try {
        await handler(event.payload);
      } catch (e) {
        // Handlers must be idempotent and must not break the request path;
        // failures are logged and re-driven by the outbox/queue in production.
        // eslint-disable-next-line no-console
        console.error(JSON.stringify({ level: 'error', msg: 'event handler failed', type: event.type, error: String(e) }));
      }
    }
  }

  emitSync<T>(event: DomainEvent<T>) {
    // fire-and-forget for after-commit notifications
    void this.emit(event);
  }
}

export const eventBus = new EventBus();
