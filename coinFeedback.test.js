import { describe, expect, it } from 'vitest';

async function feedbackRouter() {
  const module = await import('../src/items/CoinFeedback.js').catch(() => null);
  expect(module?.routeCoinEvents).toBeTypeOf('function');
  return module.routeCoinEvents;
}

describe('routeCoinEvents', () => {
  it('keeps rival feedback in the world but out of player HUD and local audio signals', async () => {
    const routeCoinEvents = await feedbackRouter();
    const player = { name: 'Marea' };
    const rival = { name: 'CoralÃ­n' };
    const rivalEvent = { type: 'coin-collect', kart: rival };

    expect(routeCoinEvents([rivalEvent], player)).toEqual({ worldEvents: [rivalEvent], playerEvents: [] });
  });

  it('signals player coin feedback and preserves it when mixed after a rival event', async () => {
    const routeCoinEvents = await feedbackRouter();
    const player = { name: 'Marea' };
    const rival = { name: 'CoralÃ­n' };
    const rivalEvent = { type: 'coin-loss', kart: rival, count: 2 };
    const playerEvent = { type: 'coin-collect', kart: player, count: 4 };

    expect(routeCoinEvents([rivalEvent, playerEvent], player)).toEqual({
      worldEvents: [rivalEvent, playerEvent],
      playerEvents: [playerEvent],
    });
  });
});
