# Brisacoral Kart Race MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la prueba de manejo en una carrera completa de tres vueltas con drift, mini-turbo, cuatro rivales, HUD y clasificación.

**Architecture:** `PlayerKart` conserva la física longitudinal/lateral y delega drift a `DriftSystem`. `RivalKart` usa la misma pista como referencia y `RaceManager` ordena participantes exclusivamente por vueltas y progreso; el HUD solo representa snapshots de carrera.

**Tech Stack:** Three.js 0.185.1, Vite 8.1.5, Vanilla JavaScript, Vitest 4.1.10, pnpm.

## Global Constraints

- Arranque directo con cuenta atrás `3–2–1–¡YA!`, sin menú.
- Cuatro rivales originales y tres vueltas.
- Drift con `Shift`, carga azul/naranja y boost al soltar.
- Física arcade determinista con delta máximo de `1/30` s.
- Sin motor físico ni recursos externos.
- Mantener 60 FPS mediante geometría simple y partículas limitadas.

---

### Task 1: Phase 1 regression fixes

**Files:** Modify `src/track/Track.js`, `tests/track.test.js`.

**Interfaces:** `Track.constrain()` debe permitir hombro de arena y detener el kart en la cara interior de la barrera; la franja de meta debe cruzar la carretera.

- [ ] Añadir pruebas que exijan `abs(signedDistance) > width` tras limitar un punto exterior y que el bounding box de la meta sea más ancho lateralmente que longitudinalmente.
- [ ] Ejecutar `pnpm test -- tests/track.test.js` y observar ambos fallos.
- [ ] Cambiar el límite duro a `width + 0.3` y construir la meta con ancho `width * 2` sobre el eje local X y profundidad `1.1`.
- [ ] Ejecutar toda la suite y commit `fix: align track collisions and finish line`.

### Task 2: Drift and mini-turbo

**Files:** Create `src/kart/DriftSystem.js`, `tests/driftSystem.test.js`; modify `src/input/KeyboardInput.js`, `src/kart/PlayerKart.js`, `src/config.js`.

**Interfaces:** `DriftSystem.update(dt,{held,steer,speed,slip,collided})` devuelve `{active,level,charge,releasedBoost}`. Azul inicia en `0.55`, naranja en `1.35`; soltar devuelve boost `0`, `1` o `2` y reinicia carga.

- [ ] Escribir pruebas para activación por velocidad, niveles, liberación y cancelación por choque.
- [ ] Confirmar RED por módulo ausente.
- [ ] Implementar máquina de estados y mapear `ShiftLeft/ShiftRight` a `drift`.
- [ ] Integrar agarre reducido, impulso temporal, contravolante, chispas y humo con un pool de 36 partículas.
- [ ] Verificar pruebas y commit `feat: add two-stage drift mini turbo`.

### Task 3: Rival AI and kart collisions

**Files:** Create `src/race/RivalKart.js`, `src/race/KartCollisions.js`, `tests/rivalKart.test.js`, `tests/kartCollisions.test.js`; modify `src/kart/createKartModel.js`.

**Interfaces:** `RivalKart(track,{t,lane,color,maxSpeed})`, `update(dt,raceActive)`, `progress`; `resolveKartCollisions(karts)` separa radios de `1.45` y aplica impulso limitado.

- [ ] Probar que un rival avanza, permanece dentro del límite y reduce velocidad ante curvatura.
- [ ] Probar separación de dos karts solapados sin velocidades mayores que `38`.
- [ ] Confirmar RED y después implementar seguimiento de un punto adelantado, cuatro paletas y colisiones.
- [ ] Observar simulación equivalente a tres vueltas y commit `feat: add four spline racing rivals`.

### Task 4: Race rules and HUD

**Files:** Create `src/race/RaceManager.js`, `src/ui/HUD.js`, `tests/raceManager.test.js`; modify `index.html`, `src/styles.css`, `src/main.js`.

**Interfaces:** `RaceManager(participants,{laps:3,countdown:3})`, `update(dt)`, `snapshot(player)` devuelve `state,countdown,lap,position,total,time,results`; `HUD.update(snapshot,kartState)`.

- [ ] Probar cuenta atrás, cruce válido en sentido correcto, protección contra doble conteo, orden por vuelta/progreso y final en vuelta 3.
- [ ] Confirmar RED y después implementar reglas puras.
- [ ] Crear HUD de velocidad, turbo, posición, vuelta y cronómetro; añadir clasificación final.
- [ ] Bloquear controles hasta `¡YA!`, arrancar a todos simultáneamente y actualizar posiciones.
- [ ] Verificar suite/build y commit `feat: complete three lap race and HUD`.

### Task 5: Browser QA

- [ ] Ejecutar `pnpm test` y `pnpm build`.
- [ ] Abrir `pnpm dev`; verificar consola sin errores, cuenta atrás sin menú, ambos turbos, adelantamientos, tres vueltas y clasificación.
- [ ] Confirmar liberación de teclas al cambiar pestaña y layout a 1280×720 y ventana estrecha.
- [ ] Registrar cualquier fallo con una prueba roja, corregirlo y repetir QA.
