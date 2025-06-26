import { produce } from 'immer';
import { Effect, GameContext, EffectResult } from '../Effect';

export class ResourceEffect extends Effect {
  readonly type = 'resource';
  readonly description: string;

  constructor(
    private readonly resourceType: string,
    private readonly amount: number,
    private readonly operation: 'gain' | 'spend' | 'set' = 'gain',
    private readonly target: 'self' | 'opponent' = 'self'
  ) {
    super();
    this.description = `${operation} ${amount} ${resourceType} (${target})`;
  }

  execute(context: GameContext): EffectResult {
    const { gameState, playerId } = context;
    const messages: string[] = [];
    let success = true;

    const targetId = this.target === 'self' ? playerId : 
      Object.keys(gameState.players).find(id => id !== playerId);

    if (!targetId) {
      return {
        success: false,
        newState: gameState,
        messages: [`No ${this.target} player found`]
      };
    }

    const player = gameState.players[targetId];
    if (!player) {
      return {
        success: false,
        newState: gameState,
        messages: [`Player ${targetId} not found`]
      };
    }
    
    const newState = produce(gameState, (draft: any) => {
      const draftPlayer = draft.players[targetId];

      const currentAmount = draftPlayer.resources[this.resourceType] || 0;

      switch (this.operation) {
        case 'gain':
          draftPlayer.resources[this.resourceType] = currentAmount + this.amount;
          messages.push(`${targetId} gains ${this.amount} ${this.resourceType}`);
          break;

        case 'spend':
          if (currentAmount < this.amount) {
            success = false;
            messages.push(`${targetId} doesn't have enough ${this.resourceType} (${currentAmount}/${this.amount})`);
          } else {
            draftPlayer.resources[this.resourceType] = currentAmount - this.amount;
            messages.push(`${targetId} spends ${this.amount} ${this.resourceType}`);
          }
          break;

        case 'set':
          draftPlayer.resources[this.resourceType] = this.amount;
          messages.push(`${targetId} ${this.resourceType} set to ${this.amount}`);
          break;
      }

    });

    return {
      success,
      newState,
      messages
    };
  }

  static gain(resourceType: string, amount: number, target?: 'self' | 'opponent'): ResourceEffect {
    return new ResourceEffect(resourceType, amount, 'gain', target);
  }

  static spend(resourceType: string, amount: number, target?: 'self' | 'opponent'): ResourceEffect {
    return new ResourceEffect(resourceType, amount, 'spend', target);
  }

  static set(resourceType: string, amount: number, target?: 'self' | 'opponent'): ResourceEffect {
    return new ResourceEffect(resourceType, amount, 'set', target);
  }
}