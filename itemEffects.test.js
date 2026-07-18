import { describe, expect, it } from 'vitest';
import { PlayerKart } from '../src/kart/PlayerKart.js';
import { RivalKart } from '../src/race/RivalKart.js';
import { Track } from '../src/track/Track.js';

describe('kart item effects', () => {
  it('keeps bubble turbo timed and below the orange mini-turbo cap', () => {
    const kart = new PlayerKart(new Track());
    kart.activateBubble();
    expect(kart.bubbleTimer).toBeGreaterThan(0);
    expect(kart.getItemBoostSpeed()).toBeLessThan(13);

    for (let i = 0; i < 100; i += 1) kart.update(1 / 60, { throttle: 0, brake: 0, steer: 0 });
    expect(kart.bubbleTimer).toBe(0);
  });

  it('lets a shell block exactly one pearl hit', () => {
    const kart = new RivalKart(new Track());
    kart.activateShell();

    expect(kart.receivePearlHit()).toEqual({ blocked: true });
    expect(kart.shellTimer).toBe(0);
    expect(kart.receivePearlHit()).toEqual({ blocked: false });
  });

  it('expires an unused shell after six seconds', () => {
    const kart = new RivalKart(new Track());
    kart.activateShell();
    kart.update(5.99, true);
    expect(kart.shellTimer).toBeGreaterThan(0);
    kart.update(0.01, true);
    expect(kart.shellTimer).toBe(0);
  });

  it('gives the player a full visible pearl-hit spin without rotating its driving heading', () => {
    const kart = new PlayerKart(new Track());
    const headingBeforeHit = kart.heading;
    kart.receivePearlHit();

    for (let i = 0; i < 30; i += 1) kart.update(1 / 60, { throttle: 0, brake: 0, steer: 0 });

    expect(Math.abs(kart.visual.rotation.y)).toBeGreaterThan(Math.PI);
    expect(kart.heading).toBeCloseTo(headingBeforeHit, 8);

    for (let i = 0; i < 15; i += 1) kart.update(1 / 60, { throttle: 0, brake: 0, steer: 0 });

    expect(kart.stunTimer).toBe(0);
    expect(kart.visual.rotation.y).toBe(0);
    expect(kart.heading).toBeCloseTo(headingBeforeHit, 8);
  });

  it('forwards a pearl impact to the optional visual event sink', () => {
    const kart = new PlayerKart(new Track());
    const events = [];
    kart.setEffectEmitter((type, position, color, shake) => events.push({ type, position: position.clone(), color, shake }));

    kart.receivePearlHit();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'impact', color: 0xff80b5, shake: 0.28 });
    expect(events[0].position.distanceTo(kart.group.position)).toBeLessThan(0.001);
  });

  it('gives rivals a full visible pearl-hit spin and restores their model rotation', () => {
    const kart = new RivalKart(new Track());
    kart.receivePearlHit();

    kart.update(0.5, true);

    expect(kart.stunTimer).toBeGreaterThan(0);
    expect(Math.abs(kart.visual.rotation.y)).toBeGreaterThan(Math.PI);

    kart.update(0.25, true);

    expect(kart.stunTimer).toBe(0);
    expect(kart.visual.rotation.y).toBe(0);
  });
});
