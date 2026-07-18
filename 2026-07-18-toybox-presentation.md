# Tropical Toy-Box Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar una pasada visual, de animación, efectos, HUD y audio que haga coherente y legible el mundo Tropical Toy-Box.

**Architecture:** `KartAnimator` y `KartEffects` consumen snapshots/eventos; `ToyBoxEnvironment` posee decoraciones animadas; `AudioSystem` es opcional. Ninguno decide resultados de carrera.

**Tech Stack:** Three.js 0.185.1, Web Audio API, CSS, Vite, Vitest.

## Global Constraints

- Sin recursos de Nintendo ni assets descargados.
- Sin postprocesado multipaso, reflejos o luces dinámicas extra.
- Pools fijos, materiales compartidos y degradación de partículas/sombras.
- Audio debe fallar de forma silenciosa y desbloquearse con primera pulsación.

---

### Task 1: Kart silhouettes and animation

**Files:** Create `src/kart/KartAnimator.js`, `tests/kartAnimator.test.js`; modify `src/kart/createKartModel.js`, `src/kart/PlayerKart.js`, `src/race/RivalKart.js`.

**Interfaces:** model exposes `parts.wheels`, `parts.steering`, `parts.driver`, `parts.suspension`; `KartAnimator.update(dt,snapshot)`.

- [ ] Test wheel rotation, steering clamp, suspension damping and hit reaction timeout using plain groups.
- [ ] Confirm RED.
- [ ] Rebuild bodies with capsule/sphere/beveled primitive layers and unique rival accessories; return `{group,parts}`.
- [ ] Integrate animator for all five karts and commit `feat: animate distinctive toybox karts` after tests/build.

### Task 2: Pooled racing effects

**Files:** Create `src/effects/KartEffects.js`, `tests/kartEffects.test.js`; modify `src/main.js`, `src/scene/FollowCamera.js`.

**Interfaces:** `emit(type,position,color)`, `update(dt)`, types `smoke,dust,spark,coin,impact,streak`; fixed capacity `72`.

- [ ] Test capacity, recycling oldest effect and expiry.
- [ ] Confirm RED.
- [ ] Implement shared plane/icosahedron geometries, drift colors, speed streaks, hit wave and bounded camera shake.
- [ ] Run suite/build and commit `feat: add pooled toybox race effects`.

### Task 3: Toy-Box circuit pass

**Files:** Create `src/scene/ToyBoxEnvironment.js`; modify `src/scene/GameScene.js`, `src/track/Track.js`.

**Interfaces:** `ToyBoxEnvironment(track)`, `group`, `update(dt,elapsed)`, `setQuality(level)`.

- [ ] Add deterministic smoke test verifying environment creates fewer than `350` scene objects and reuses materials.
- [ ] Confirm RED.
- [ ] Implement curbs/arrows, coral tunnel, start arch, foam rings, layered islands, swaying palms, windmills, fish balloons and boats.
- [ ] Take browser screenshots at start, curve and ramp; remove occluding or noisy props.
- [ ] Commit `feat: transform Brisacoral into tropical toybox`.

### Task 4: HUD motion and synthesized audio

**Files:** Create `src/audio/AudioSystem.js`, `tests/audioSystem.test.js`; modify `src/ui/HUD.js`, `src/styles.css`, `index.html`, `src/main.js`.

**Interfaces:** `unlock()`, `updateEngine(speed,boost)`, `play(event)`, `dispose()`; no-op when context creation fails.

- [ ] Test no-op fallback with a throwing context factory and event cooldowns.
- [ ] Confirm RED.
- [ ] Implement oscillators/noise envelopes for countdown, motor, drift, turbo, collect, item, jump and hit.
- [ ] Add animated item slot, coins, position bump, lap banner and responsive reduced-motion variants.
- [ ] Run suite/build, inspect console and commit `feat: polish HUD motion and arcade audio`.

### Task 5: Performance and final QA

**Files:** Modify `src/scene/GameScene.js`, `src/main.js`; create `tests/qualityController.test.js` if a controller is required.

- [ ] Measure one complete lap at desktop viewport; record frame pacing and object count.
- [ ] Reduce particles below 50 FPS sustained; then shadow map from 1024 to 512; then disable dynamic shadows.
- [ ] Verify desktop and 480×800 HUD, keyboard focus reset, all items, frontal recovery, three laps and classification.
- [ ] Run `pnpm test` and `pnpm build`; expected zero failures and successful bundle.
- [ ] Commit `perf: finalize adaptive toybox presentation`.

## Final Acceptance Gate

The upgrade is complete only after the driving, items and presentation gates all pass in order and browser console remains free of errors or deprecation warnings.
