import { produce } from 'immer';
import { Effect, GameContext, EffectResult } from '../Effect';

export class HealEffect extends Effect {
  readonly type = 'heal';
  readonly description: string;

  constructor(
    private readonly amount: number,
    private readonly target: 'self' | 'ally' | 'all' = 'self'
  ) {
    super();
    this.description = `Heal ${amount} to ${target}`;
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
            const actualHeal = Math.min(this.amount, selfPlayer.maxHealth - selfPlayer.health);
            selfPlayer.health += actualHeal;
            messages.push(`${playerId} heals ${actualHeal} health`);
          } else {
            success = false;
            messages.push(`Player ${playerId} not found`);
          }
          break;

        case 'ally':
          const allyId = Object.keys(draft.players).find(id => id !== playerId);
          if (allyId) {
            const ally = draft.players[allyId];
            const actualHeal = Math.min(this.amount, ally.maxHealth - ally.health);
            ally.health += actualHeal;
            messages.push(`${allyId} heals ${actualHeal} health`);
          } else {
            success = false;
            messages.push('No ally found');
          }
          break;

        case 'all':
          for (const [id, player] of Object.entries(draft.players) as [string, any][]) {
            const actualHeal = Math.min(this.amount, player.maxHealth - player.health);
            player.health += actualHeal;
            messages.push(`${id} heals ${actualHeal} health`);
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

  static create(amount: number, target?: 'self' | 'ally' | 'all'): HealEffect {
    return new HealEffect(amount, target);
  }
}