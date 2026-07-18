# Tropical Toy-Box Driving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar el bloqueo frontal y añadir rebufo, rampas, aterrizajes y placas turbo sin degradar el drift existente.

**Architecture:** `AntiStuckSystem` decide correcciones de contacto usando datos puros; `TrackFeatures` describe zonas de pista; `PlayerKart` consume sus resultados. La representación 3D se mantiene separada de las reglas.

**Tech Stack:** Three.js 0.185.1, Vite 8.1.5, JavaScript ES modules, Vitest 4.1.10, pnpm.

## Global Constraints

- Mantener `WASD`/flechas, `Shift` para drift/acrobacia y delta máximo `1/30` s.
- Ningún contacto frontal puede impedir reversa o giro.
- Mantener tres vueltas, cuatro rivales y 60 FPS objetivo.
- Escribir prueba roja antes de modificar comportamiento.

---

### Task 1: Frontal barrier recovery

**Files:** Create `src/kart/AntiStuckSystem.js`, `tests/antiStuckSystem.test.js`; modify `src/track/Track.js`, `src/kart/PlayerKart.js`, `tests/playerKart.test.js`.

**Interfaces:** `AntiStuckSystem.update(dt,{collided,speed,outwardSpeed,steer,brake,sideSign,tangent,side}): {inset,velocityBias,headingBlend}`; `Track.constrain()` additionally returns `info` and `outwardSpeed`.

- [ ] Write a failing regression test:

```js
it('backs away after a centered frontal barrier impact', () => {
  const track = new Track();
  const kart = new PlayerKart(track);
  const edge = track.getSample(0.25);
  kart.group.position.copy(edge.center).addScaledVector(edge.side, track.width + 0.29);
  kart.heading = Math.atan2(edge.side.x, edge.side.z);
  kart.forwardSpeed = 18;
  kart.update(1 / 60, { throttle: 1, brake: 0, steer: 0, drift: false });
  for (let i = 0; i < 30; i += 1) kart.update(1 / 60, { throttle: 0, brake: 1, steer: -1, drift: false });
  expect(Math.abs(track.getClosestInfo(kart.group.position).signedDistance)).toBeLessThan(track.width);
  expect(kart.speed).toBeLessThan(0);
});
```

- [ ] Run `pnpm test -- tests/playerKart.test.js`; expected FAIL because the kart remains on the boundary.
- [ ] Implement a `0.08`-unit inward inset on collision, preserve inward velocity, add tangential bias `1.5`, and after `0.6` seconds blend heading `25%` toward track tangent.
- [ ] Run `pnpm test`; expected all tests PASS.
- [ ] Commit `fix: guarantee recovery from frontal barriers`.

### Task 2: Slipstream

**Files:** Create `src/kart/SlipstreamSystem.js`, `tests/slipstreamSystem.test.js`; modify `src/kart/PlayerKart.js`, `src/main.js`, `src/ui/HUD.js`.

**Interfaces:** `SlipstreamSystem.update(dt,{player,targets}): {charge,boost}`; target qualifies within `14` units, behind cone dot `>0.88`, charge threshold `1.4` seconds.

- [ ] Write tests for charging, decay outside cone and a single released boost.
- [ ] Run test; expected module-not-found failure.
- [ ] Implement vector cone checks and integrate a `0.8`-second speed boost capped below orange mini-turbo.
- [ ] Add HUD wind streak state from `charge` without changing physics.
- [ ] Run suite/build and commit `feat: add readable slipstream boost`.

### Task 3: Ramps, airtime and boost pads

**Files:** Create `src/track/TrackFeatures.js`, `src/kart/JumpSystem.js`, `tests/trackFeatures.test.js`, `tests/jumpSystem.test.js`; modify `src/main.js`, `src/track/Track.js`, `src/kart/PlayerKart.js`.

**Interfaces:** `TrackFeatures.query(position): {ramp,pad}`; `JumpSystem.update(dt,{ramp,driftPressed}): {height,pitch,landed,trickBoost}`.

- [ ] Test one-shot ramp launch, parabolic landing, Shift landing window `0.22` seconds and pad cooldown `0.5` seconds.
- [ ] Confirm RED for missing modules.
- [ ] Implement two ramps at progress `0.19`/`0.63` and three pads at `0.08`/`0.44`/`0.79` using shared geometry.
- [ ] Integrate vertical visual offset only; horizontal collision remains spline-based.
- [ ] Run suite/build and commit `feat: add ramps tricks and current pads`.

## Acceptance Gate

Manually hit barriers head-on at five track points, recover with reverse, trigger rebufo, use every ramp and verify both normal and trick landings before starting the items plan.
