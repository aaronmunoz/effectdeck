
export interface Service {
  readonly id: string;
}

export interface Provider<T extends Service> {
  provide(): T;
}

export class Context {
  private readonly services = new Map<string, Service>();
  private readonly providers = new Map<string, Provider<any>>();

  register<T extends Service>(id: string, provider: Provider<T>): Context {
    return new Context().copyFrom(this).addProvider(id, provider);
  }

  provide<T extends Service>(id: string): T {
    const cached = this.services.get(id);
    if (cached) {
      return cached as T;
    }

    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`No provider registered for service: ${id}`);
    }

    const service = provider.provide();
    this.services.set(id, service);
    return service as T;
  }

  has(id: string): boolean {
    return this.providers.has(id) || this.services.has(id);
  }

  fork(): Context {
    return new Context().copyFrom(this);
  }

  private copyFrom(other: Context): Context {
    for (const [id, provider] of other.providers.entries()) {
      this.providers.set(id, provider);
    }
    for (const [id, service] of other.services.entries()) {
      this.services.set(id, service);
    }
    return this;
  }

  private addProvider<T extends Service>(id: string, provider: Provider<T>): Context {
    this.providers.set(id, provider);
    return this;
  }
}

export interface Logger extends Service {
  readonly id: 'logger';
  log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

export interface RandomGenerator extends Service {
  readonly id: 'random';
  next(): number;
  nextInt(min: number, max: number): number;
  shuffle<T>(array: T[]): T[];
  pick<T>(array: T[]): T;
}

export interface GameStorage extends Service {
  readonly id: 'storage';
  save(key: string, data: unknown): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

export interface EventBus extends Service {
  readonly id: 'eventBus';
  emit(event: string, data?: unknown): void;
  subscribe(event: string, handler: (data?: unknown) => void): () => void;
}

export class ConsoleLogger implements Logger {
  readonly id = 'logger' as const;

  log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (metadata) {
      console[level](logMessage, metadata);
    } else {
      console[level](logMessage);
    }
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, metadata);
  }
}

export class SeededRandomGenerator implements RandomGenerator {
  readonly id = 'random' as const;
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Math.random();
  }

  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

export class MemoryStorage implements GameStorage {
  readonly id = 'storage' as const;
  private readonly data = new Map<string, unknown>();

  async save(key: string, data: unknown): Promise<void> {
    this.data.set(key, JSON.parse(JSON.stringify(data)));
  }

  async load<T>(key: string): Promise<T | null> {
    const data = this.data.get(key);
    return data ? JSON.parse(JSON.stringify(data)) as T : null;
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}

export class SimpleEventBus implements EventBus {
  readonly id = 'eventBus' as const;
  private readonly handlers = new Map<string, Set<(data?: unknown) => void>>();

  emit(event: string, data?: unknown): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }
  }

  subscribe(event: string, handler: (data?: unknown) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.add(handler);

    return () => {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    };
  }
}

export const defaultContext = new Context()
  .register('logger', { provide: () => new ConsoleLogger() })
  .register('random', { provide: () => new SeededRandomGenerator() })
  .register('storage', { provide: () => new MemoryStorage() })
  .register('eventBus', { provide: () => new SimpleEventBus() });