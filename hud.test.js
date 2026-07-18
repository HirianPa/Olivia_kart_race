import { afterEach, describe, expect, it, vi } from 'vitest';
import { HUD } from '../src/ui/HUD.js';

function element() {
  return { textContent: '', dataset: {}, style: { setProperty() {} }, querySelector: () => null };
}

function makeHud() {
  const elements = Object.fromEntries(['position', 'lap', 'time', 'speed', 'turbo', 'countdown', 'results', 'item', 'coins', 'coin-event', 'lap-banner', 'lap-wave'].map((name) => [name, element()]));
  return {
    hud: new HUD({ querySelector: (selector) => elements[selector.match(/"(.+)"/)[1]] }),
    elements,
  };
}

const snapshot = { position: 1, total: 5, lap: 1, totalLaps: 3, time: 0, state: 'racing' };
const kart = { speed: 0, coinCount: 0, driftState: { charge: 0, level: 0, boostLevel: 0 }, slipstreamState: { active: false, charge: 0 } };

describe('HUD coin feedback', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps the newest rapid coin notice visible for its full duration', () => {
    vi.useFakeTimers();
    const { hud, elements } = makeHud();

    hud.update(snapshot, kart, null, { type: 'coin-collect' });
    vi.advanceTimersByTime(500);
    hud.update(snapshot, kart, null, { type: 'coin-loss', count: 3 });
    vi.advanceTimersByTime(400);

    expect(elements['coin-event'].dataset.visible).toBe('true');
    expect(elements['coin-event'].textContent).toBe('-3 SOLAR');
    vi.advanceTimersByTime(420);
    expect(elements['coin-event'].dataset.visible).toBe('false');
  });

  it('marks the toy dashboard pieces when race state changes', () => {
    const { hud, elements } = makeHud();
    hud.update(snapshot, kart, null);
    hud.update({ ...snapshot, position: 2, lap: 2 }, { ...kart, coinCount: 1 }, 'bubble');

    expect(elements.position.dataset.bump).toBe('true');
    expect(elements.coins.dataset.pulse).toBe('true');
    expect(elements.item.dataset.pop).toBe('true');
    expect(elements['lap-banner'].textContent).toBe('VUELTA 2/3');
    expect(elements['lap-banner'].dataset.wave).toBe('true');
    expect(elements['lap-wave'].dataset.travel).toBe('true');
  });

  it('labels the final classification panel as RACE RESULTS', () => {
    const { hud, elements } = makeHud();

    hud.update({ ...snapshot, state: 'finished', results: [{ position: 1, name: 'Player', time: 12.34 }] }, kart);

    expect(elements.results.innerHTML).toContain('<h1>RACE RESULTS</h1>');
    expect(elements.results.innerHTML).not.toContain('BRISACORAL');
  });
});
