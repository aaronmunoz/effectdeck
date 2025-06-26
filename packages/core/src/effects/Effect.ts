
export interface GameContext {
  readonly playerId: string;
  readonly gameState: GameState;
  readonly random: () => number;
  readonly log: (message: string) => void;
}

export interface GameState {
  readonly players: Record<string, PlayerState>;
  readonly currentPlayer: string;
  readonly turn: number;
  readonly phase: GamePhase;
}

export interface PlayerState {
  readonly id: string;
  readonly health: number;
  readonly maxHealth: number;
  readonly hand: Card[];
  readonly deck: Card[];
  readonly discardPile: Card[];
  readonly resources: Record<string, number>;
}

export interface Card {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly effects: Effect[];
  readonly tags: string[];
}

export type GamePhase = 'draw' | 'main' | 'discard' | 'end';

export interface EffectResult {
  readonly success: boolean;
  readonly newState: GameState;
  readonly messages: string[];
  readonly metadata?: Record<string, unknown>;
}

export abstract class Effect {
  abstract readonly type: string;
  abstract readonly description: string;

  abstract execute(context: GameContext): EffectResult;

  compose(other: Effect): CompositeEffect {
    return new CompositeEffect([this, other]);
  }

  chain(fn: (result: EffectResult) => Effect): ChainedEffect {
    return new ChainedEffect(this, fn);
  }

  conditional(predicate: (context: GameContext) => boolean): ConditionalEffect {
    return new ConditionalEffect(this, predicate);
  }

  repeat(times: number): RepeatedEffect {
    return new RepeatedEffect(this, times);
  }

  withContext<T>(key: string, value: T): ContextualEffect {
    return new ContextualEffect(this, key, value);
  }

  static all(effects: Effect[]): CompositeEffect {
    return new CompositeEffect(effects);
  }

  static sequence(effects: Effect[]): SequentialEffect {
    return new SequentialEffect(effects);
  }

  static parallel(effects: Effect[]): ParallelEffect {
    return new ParallelEffect(effects);
  }
}

export class CompositeEffect extends Effect {
  readonly type = 'composite';
  readonly description: string;

  constructor(private readonly effects: Effect[]) {
    super();
    this.description = `Composite: ${effects.map(e => e.description).join(', ')}`;
  }

  execute(context: GameContext): EffectResult {
    let currentState = context.gameState;
    const allMessages: string[] = [];
    let success = true;

    for (const effect of this.effects) {
      const result = effect.execute({ ...context, gameState: currentState });
      currentState = result.newState;
      allMessages.push(...result.messages);
      
      if (!result.success) {
        success = false;
        break;
      }
    }

    return {
      success,
      newState: currentState,
      messages: allMessages
    };
  }
}

export class ChainedEffect extends Effect {
  readonly type = 'chained';
  readonly description: string;

  constructor(
    private readonly first: Effect,
    private readonly chainFn: (result: EffectResult) => Effect
  ) {
    super();
    this.description = `Chained: ${first.description} -> (dynamic)`;
  }

  execute(context: GameContext): EffectResult {
    const firstResult = this.first.execute(context);
    if (!firstResult.success) {
      return firstResult;
    }

    const nextEffect = this.chainFn(firstResult);
    const secondResult = nextEffect.execute({ ...context, gameState: firstResult.newState });

    return {
      success: secondResult.success,
      newState: secondResult.newState,
      messages: [...firstResult.messages, ...secondResult.messages]
    };
  }
}

export class ConditionalEffect extends Effect {
  readonly type = 'conditional';
  readonly description: string;

  constructor(
    private readonly effect: Effect,
    private readonly predicate: (context: GameContext) => boolean
  ) {
    super();
    this.description = `Conditional: ${effect.description}`;
  }

  execute(context: GameContext): EffectResult {
    if (this.predicate(context)) {
      return this.effect.execute(context);
    }

    return {
      success: true,
      newState: context.gameState,
      messages: [`Condition not met for: ${this.effect.description}`]
    };
  }
}

export class RepeatedEffect extends Effect {
  readonly type = 'repeated';
  readonly description: string;

  constructor(
    private readonly effect: Effect,
    private readonly times: number
  ) {
    super();
    this.description = `Repeat ${times}x: ${effect.description}`;
  }

  execute(context: GameContext): EffectResult {
    let currentState = context.gameState;
    const allMessages: string[] = [];
    let success = true;

    for (let i = 0; i < this.times; i++) {
      const result = this.effect.execute({ ...context, gameState: currentState });
      currentState = result.newState;
      allMessages.push(...result.messages);
      
      if (!result.success) {
        success = false;
        break;
      }
    }

    return {
      success,
      newState: currentState,
      messages: allMessages
    };
  }
}

export class ContextualEffect extends Effect {
  readonly type = 'contextual';
  readonly description: string;

  constructor(
    private readonly effect: Effect,
    private readonly key: string,
    private readonly value: unknown
  ) {
    super();
    this.description = `With context [${key}]: ${effect.description}`;
  }

  execute(context: GameContext): EffectResult {
    const enhancedContext = {
      ...context,
      [this.key]: this.value
    };
    
    return this.effect.execute(enhancedContext);
  }
}

export class SequentialEffect extends Effect {
  readonly type = 'sequential';
  readonly description: string;

  constructor(private readonly effects: Effect[]) {
    super();
    this.description = `Sequential: ${effects.map(e => e.description).join(' -> ')}`;
  }

  execute(context: GameContext): EffectResult {
    let currentState = context.gameState;
    const allMessages: string[] = [];

    for (const effect of this.effects) {
      const result = effect.execute({ ...context, gameState: currentState });
      currentState = result.newState;
      allMessages.push(...result.messages);
      
      if (!result.success) {
        return {
          success: false,
          newState: currentState,
          messages: allMessages
        };
      }
    }

    return {
      success: true,
      newState: currentState,
      messages: allMessages
    };
  }
}

export class ParallelEffect extends Effect {
  readonly type = 'parallel';
  readonly description: string;

  constructor(private readonly effects: Effect[]) {
    super();
    this.description = `Parallel: ${effects.map(e => e.description).join(' | ')}`;
  }

  execute(context: GameContext): EffectResult {
    const results = this.effects.map(effect => effect.execute(context));
    const success = results.every(r => r.success);
    const allMessages = results.flatMap(r => r.messages);

    let finalState = context.gameState;
    if (success) {
      finalState = results.reduce((state, result) => {
        return { ...state, ...result.newState };
      }, context.gameState);
    }

    return {
      success,
      newState: finalState,
      messages: allMessages
    };
  }
}