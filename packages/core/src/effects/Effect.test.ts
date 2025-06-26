import { expect } from 'chai';
import { GameContext, GameState } from './Effect';

describe('Effect System', () => {
  it('should create a DamageEffect', () => {
    const effect = new DamageEffect(10);
    expect(effect.type).to.equal('damage');
    expect(effect.description).to.contain('10 damage');
  });

  it('should execute a DamageEffect', () => {
    const effect = new DamageEffect(5);
    
    const gameState: GameState = {
      players: {
        'player1': { id: 'player1', health: 100, maxHealth: 100, hand: [], deck: [], discardPile: [], resources: {} },
        'player2': { id: 'player2', health: 100, maxHealth: 100, hand: [], deck: [], discardPile: [], resources: {} }
      },
      currentPlayer: 'player1',
      turn: 1,
      phase: 'main'
    };
    
    const context: GameContext = {
      playerId: 'player1',
      gameState,
      random: () => 0.5,
      log: () => {}
    };
    
    const result = effect.execute(context);
    expect(result.success).to.be.true;
    expect(result.messages).to.be.an('array');
    expect(result.newState.players['player2'].health).to.equal(95);
  });
});