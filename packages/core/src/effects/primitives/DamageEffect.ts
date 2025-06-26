import { produce } from 'immer';
import { Effect, GameContext, EffectResult } from '../Effect.js';

export class DamageEffect extends Effect {
  readonly type = 'damage';
  readonly description: string;

  constructor(
    private readonly amount: number,
    private readonly target: 'self' | 'opponent' | 'all' = 'opponent'
  ) {
    super();
    this.description = `Deal ${amount} damage to ${target}`;
  }

  execute(context: GameContext): EffectResult {
    const { gameState, playerId } = context;
    const messages: string[] = [];
    let success = true;
    
    const newState = produce(gameState, (draft: any) => {
      switch (this.target) {
        case 'self':
          const selfPlayer = draft.players[playerId];
          if (selfPlayer) {
            const actualDamage = Math.min(this.amount, selfPlayer.health);
            selfPlayer.health -= actualDamage;
            messages.push(`${playerId} takes ${actualDamage} damage`);
          } else {
            success = false;
            messages.push(`Player ${playerId} not found`);
          }
          break;

        case 'opponent':
          const opponentId = Object.keys(draft.players).find(id => id !== playerId);
          if (opponentId) {
            const opponent = draft.players[opponentId];
            const actualDamage = Math.min(this.amount, opponent.health);
            opponent.health -= actualDamage;
            messages.push(`${opponentId} takes ${actualDamage} damage`);
          } else {
            success = false;
            messages.push('No opponent found');
          }
          break;

        case 'all':
          for (const [id, player] of Object.entries(draft.players) as [string, any][]) {
            const actualDamage = Math.min(this.amount, player.health);
            player.health -= actualDamage;
            messages.push(`${id} takes ${actualDamage} damage`);
          }
          break;
      }
    });

    return {
      success,
      newState,
      messages
    };
  }

  static create(amount: number, target?: 'self' | 'opponent' | 'all'): DamageEffect {
    return new DamageEffect(amount, target);
  }
}