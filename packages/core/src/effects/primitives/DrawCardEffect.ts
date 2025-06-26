import { produce } from 'immer';
import { Effect, GameContext, EffectResult } from '../Effect.js';

export class DrawCardEffect extends Effect {
  readonly type = 'draw';
  readonly description: string;

  constructor(
    private readonly count: number = 1,
    private readonly target: 'self' | 'opponent' = 'self'
  ) {
    super();
    this.description = `Draw ${count} card${count > 1 ? 's' : ''} (${target})`;
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
      let cardsDrawn = 0;
      for (let i = 0; i < this.count; i++) {
        if (draftPlayer.deck.length === 0) {
          if (draftPlayer.discardPile.length === 0) {
            messages.push(`${targetId} cannot draw - no cards available`);
            break;
          }
          
          draftPlayer.deck = [...draftPlayer.discardPile];
          draftPlayer.discardPile = [];
          messages.push(`${targetId} shuffles discard pile into deck`);
        }

        if (draftPlayer.deck.length > 0) {
          const card = draftPlayer.deck.pop()!;
          draftPlayer.hand.push(card);
          cardsDrawn++;
        }
      }

      if (cardsDrawn > 0) {
        messages.push(`${targetId} draws ${cardsDrawn} card${cardsDrawn > 1 ? 's' : ''}`);
      }

    });

    return {
      success,
      newState,
      messages
    };
  }

  static create(count?: number, target?: 'self' | 'opponent'): DrawCardEffect {
    return new DrawCardEffect(count, target);
  }
}