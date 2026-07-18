# Brisacoral Kart Layer 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar una primera capa jugable en navegador con el mundo de Brisacoral, circuito cerrado, kart controlable, límites estables y cámara de persecución suave.

**Architecture:** La simulación usa una spline cerrada como única referencia espacial para construir la carretera y consultar centro, tangente, normal, ancho y progreso. `PlayerKart` conserva velocidades longitudinal y lateral y delega límites a `Track`; `FollowCamera` interpola posición y mirada sin participar en la física.

**Tech Stack:** Three.js estable vía npm, Vite, Vanilla JavaScript ES modules, Vitest, pnpm.

## Global Constraints

- Usar Three.js estable instalado como `three@latest`; no usar CDN.
- Usar Vite, JavaScript modular y pnpm.
- No mostrar menú inicial ni requerir clic para entrar al juego.
- Mantener arte original low-poly del Archipiélago Brisacoral; no usar IP ni recursos de Nintendo.
- Limitar `devicePixelRatio` a `2` y limitar el paso de simulación a `1 / 30` segundos.
- La capa 1 no incluye drift, mini-turbo, rivales, vueltas ni HUD definitivo.
- Debe aceptar `WASD` y flechas, limpiar entradas al perder foco y mostrar un mensaje si WebGL falla.
- Cada tarea termina en un estado ejecutable o verificable y en un commit independiente.

## File Map

- `package.json`: scripts y dependencias.
- `index.html`: único contenedor del juego y mensaje de compatibilidad.
- `src/styles.css`: lienzo a pantalla completa, aviso de controles y fallback.
- `src/main.js`: composición, reloj, bucle y resize.
- `src/config.js`: constantes visuales y físicas compartidas.
- `src/input/KeyboardInput.js`: estado normalizado de teclado.
- `src/math/arcadeMath.js`: funciones puras de amortiguación y límites.
- `src/track/Track.js`: spline, malla, bordes y consulta espacial.
- `src/kart/createKartModel.js`: geometría original del kart y conductor.
- `src/kart/PlayerKart.js`: física arcade y representación visual.
- `src/scene/GameScene.js`: renderer, luces, niebla y entorno tropical.
- `src/scene/FollowCamera.js`: cámara amortiguada.
- `tests/arcadeMath.test.js`: pruebas de utilidades matemáticas.
- `tests/track.test.js`: pruebas de continuidad, límites y progreso.
- `tests/playerKart.test.js`: pruebas de aceleración, frenado y colisión.

---

### Task 1: Project shell and deterministic math

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/config.js`
- Create: `src/math/arcadeMath.js`
- Create: `tests/arcadeMath.test.js`

**Interfaces:**
- Produces: `damp(current, target, lambda, dt): number`, `clampDelta(dt): number`, `moveToward(current, target, maxDelta): number`.
- Consumes: nothing.

- [ ] **Step 1: Create package metadata and install exact resolved dependencies**

Create `package.json`:

```json
{
  "name": "brisacoral-kart",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run"
  }
}
```

Run:

```powershell
pnpm add three@latest
pnpm add -D vite@latest vitest@latest
```

Expected: `pnpm-lock.yaml` is created and `pnpm list three vite vitest` reports one resolved version of each package.

- [ ] **Step 2: Write the failing math tests**

Create `tests/arcadeMath.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { clampDelta, damp, moveToward } from '../src/math/arcadeMath.js';

describe('arcadeMath', () => {
  it('limits long frames to 1/30 second', () => {
    expect(clampDelta(0.2)).toBeCloseTo(1 / 30);
  });

  it('damps without overshooting', () => {
    const result = damp(0, 10, 8, 1 / 60);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(10);
  });

  it('moves toward a target by a bounded amount', () => {
    expect(moveToward(2, 10, 3)).toBe(5);
    expect(moveToward(9, 10, 3)).toBe(10);
    expect(moveToward(2, -10, 3)).toBe(-1);
  });
});
```

- [ ] **Step 3: Run the test and confirm the expected failure**

Run: `pnpm test -- tests/arcadeMath.test.js`

Expected: FAIL because `src/math/arcadeMath.js` does not exist.

- [ ] **Step 4: Implement the math helpers**

Create `src/math/arcadeMath.js`:

```js
export const clampDelta = (dt) => Math.min(Math.max(dt, 0), 1 / 30);

export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}
```

Create `src/config.js`:

```js
export const COLORS = {
  sky: 0x84d8d1,
  water: 0x28bfc1,
  asphalt: 0x405a66,
  coral: 0xff765f,
  sand: 0xf7d58b,
  palm: 0x75c94b,
};

export const KART_PHYSICS = {
  maxForwardSpeed: 34,
  maxReverseSpeed: 9,
  acceleration: 18,
  braking: 30,
  coastDrag: 8,
  lateralGrip: 9,
  steerRate: 2.25,
  offroadDrag: 20,
  boundaryBounce: 0.18,
};
```

- [ ] **Step 5: Add the browser shell**

Create `index.html` with `#app`, `#compatibility`, and a module script for `/src/main.js`. Create `src/styles.css` with a full-viewport black body, a fixed canvas, a bottom-left controls hint (`WASD / flechas`) and a centered hidden compatibility panel toggled by `[data-visible='true']`.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test -- tests/arcadeMath.test.js`

Expected: 3 tests PASS.

Run:

```powershell
git add package.json pnpm-lock.yaml index.html src/styles.css src/config.js src/math/arcadeMath.js tests/arcadeMath.test.js
git commit -m "chore: scaffold Brisacoral kart runtime"
```

---

### Task 2: Closed track and spatial queries

**Files:**
- Create: `src/track/Track.js`
- Create: `tests/track.test.js`

**Interfaces:**
- Produces: `new Track()`, `track.group: THREE.Group`, `track.getSample(t): { center, tangent, side, width }`, `track.getClosestInfo(position): { t, center, tangent, side, signedDistance, width, onRoad }`, `track.constrain(position, velocity): { position, velocity, collided }`.
- Consumes: `COLORS` from `src/config.js`.

- [ ] **Step 1: Write failing spatial-query tests**

Create `tests/track.test.js`:

```js
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Track } from '../src/track/Track.js';

describe('Track', () => {
  const track = new Track();

  it('is continuous across the lap seam', () => {
    const start = track.getSample(0).center;
    const end = track.getSample(1).center;
    expect(start.distanceTo(end)).toBeLessThan(0.001);
  });

  it('recognizes the center line as road', () => {
    const center = track.getSample(0.25).center;
    const info = track.getClosestInfo(center);
    expect(info.onRoad).toBe(true);
    expect(Math.abs(info.signedDistance)).toBeLessThan(0.2);
  });

  it('pushes positions back inside the hard boundary', () => {
    const sample = track.getSample(0.4);
    const outside = sample.center.clone().addScaledVector(sample.side, sample.width);
    const result = track.constrain(outside, new THREE.Vector3(4, 0, 0));
    expect(result.collided).toBe(true);
    expect(track.getClosestInfo(result.position).onRoad).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests and confirm failure**

Run: `pnpm test -- tests/track.test.js`

Expected: FAIL because `Track.js` does not exist.

- [ ] **Step 3: Implement the track data model**

Create a closed `THREE.CatmullRomCurve3` from 12 explicit points spanning approximately 240 × 180 world units. Use 512 precomputed samples. `getSample(t)` wraps `t` into `[0,1)`, obtains the curve point and normalized tangent, computes `side = (-tangent.z, 0, tangent.x)`, and returns width `11`.

`getClosestInfo(position)` scans cached samples, chooses the minimum horizontal squared distance, and calculates signed lateral distance by dotting the center-to-position vector with `side`. Set `onRoad` when `abs(signedDistance) <= width - 0.7`.

`constrain(position, velocity)` clamps signed distance to `±(width - 0.8)`. On collision, replace the outward lateral velocity component with the opposite component multiplied by `KART_PHYSICS.boundaryBounce` and return cloned vectors so callers retain ownership.

- [ ] **Step 4: Generate visible road and barriers from the same samples**

Build one indexed `BufferGeometry` ribbon with left/right vertices for every sample plus the repeated seam. Add a sand shoulder ribbon beneath it. Place low-poly barrier blocks every fourth sample on both sides, except across the start straight opening. Add a coral-and-cream checker stripe at `t = 0`.

Use `MeshStandardMaterial` with flat colors, `roughness: 0.9`, and no texture downloads. Set road and barriers to receive shadows; nearby barriers cast shadows.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test -- tests/track.test.js`

Expected: 3 tests PASS.

Run:

```powershell
git add src/track/Track.js tests/track.test.js
git commit -m "feat: add closed procedural island track"
```

---

### Task 3: Keyboard input and arcade kart

**Files:**
- Create: `src/input/KeyboardInput.js`
- Create: `src/kart/createKartModel.js`
- Create: `src/kart/PlayerKart.js`
- Create: `tests/playerKart.test.js`

**Interfaces:**
- Produces: `new KeyboardInput(target)`, `input.read(): { throttle, brake, steer }`, `input.dispose()`.
- Produces: `new PlayerKart(track)`, `kart.group`, `kart.speed`, `kart.update(dt, controls)`.
- Consumes: `Track.getSample()`, `Track.getClosestInfo()`, `Track.constrain()` and `KART_PHYSICS`.

- [ ] **Step 1: Write failing movement tests**

Create `tests/playerKart.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { PlayerKart } from '../src/kart/PlayerKart.js';
import { Track } from '../src/track/Track.js';

describe('PlayerKart', () => {
  it('accelerates progressively and respects max speed', () => {
    const kart = new PlayerKart(new Track());
    for (let i = 0; i < 600; i += 1) {
      kart.update(1 / 60, { throttle: 1, brake: 0, steer: 0 });
    }
    expect(kart.speed).toBeGreaterThan(25);
    expect(kart.speed).toBeLessThanOrEqual(34.01);
  });

  it('loses speed while coasting', () => {
    const kart = new PlayerKart(new Track());
    for (let i = 0; i < 120; i += 1) kart.update(1 / 60, { throttle: 1, brake: 0, steer: 0 });
    const before = kart.speed;
    for (let i = 0; i < 60; i += 1) kart.update(1 / 60, { throttle: 0, brake: 0, steer: 0 });
    expect(kart.speed).toBeLessThan(before);
  });

  it('remains on the road under sustained steering', () => {
    const track = new Track();
    const kart = new PlayerKart(track);
    for (let i = 0; i < 900; i += 1) kart.update(1 / 60, { throttle: 1, brake: 0, steer: 1 });
    expect(track.getClosestInfo(kart.group.position).onRoad).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm test -- tests/playerKart.test.js`

Expected: FAIL because `PlayerKart.js` does not exist.

- [ ] **Step 3: Implement normalized keyboard input**

`KeyboardInput` maps `KeyW`/`ArrowUp` to throttle, `KeyS`/`ArrowDown` to brake, and left/right pairs to `-1/+1` steer. Prevent default only for game keys. Clear the pressed set on `window.blur` and `document.visibilitychange`; `dispose()` removes all listeners.

- [ ] **Step 4: Build the original low-poly kart**

`createKartModel()` returns a `THREE.Group` facing local `+Z`. Compose it from primitive box, cylinder, sphere and cone geometries: turquoise body, dark chassis, four black wheels, coral seat, driver torso, spherical head, and a pale puffer-fish helmet with six small conical fins. Enable shadow casting only on major meshes and keep total geometry below 5,000 triangles.

- [ ] **Step 5: Implement minimal arcade physics**

Initialize at `track.getSample(0.03)`, aligned to its tangent. Maintain `heading`, `forwardSpeed`, `lateralSpeed`, and a world-space velocity. Each update:

1. Clamp `dt` with `clampDelta`.
2. Move forward speed toward max, reverse, or zero using acceleration/braking/coast drag.
3. Scale steering by `0.25 + 0.75 * min(abs(speed) / 16, 1)` and reverse its sign while reversing.
4. Update heading; derive forward and right vectors.
5. Damp lateral speed toward zero using `lateralGrip`.
6. Apply `offroadDrag` when `getClosestInfo().onRoad` is false.
7. Advance position and pass position/velocity through `track.constrain()`.
8. Reconstruct longitudinal and lateral speeds from the constrained velocity.
9. Set group yaw and lean the visual root up to `±0.08` radians.

Expose `speed` as `Math.abs(forwardSpeed) * 3.6` in km/h only if HUD consumes it; for this layer tests use internal world-unit speed through a documented `speed` getter returning `forwardSpeed`.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test -- tests/playerKart.test.js`

Expected: 3 tests PASS.

Run:

```powershell
git add src/input/KeyboardInput.js src/kart/createKartModel.js src/kart/PlayerKart.js tests/playerKart.test.js
git commit -m "feat: add responsive arcade kart controls"
```

---

### Task 4: Tropical scene and smooth follow camera

**Files:**
- Create: `src/scene/GameScene.js`
- Create: `src/scene/FollowCamera.js`

**Interfaces:**
- Produces: `new GameScene(container): { scene, camera, renderer, update(dt, elapsed), resize(), dispose() }`.
- Produces: `new FollowCamera(camera, target)`, `follow.update(dt, speedRatio)`.
- Consumes: `COLORS`, `damp`, `PlayerKart.group`.

- [ ] **Step 1: Implement WebGL scene lifecycle**

`GameScene` creates `WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })`, sets pixel ratio to `min(devicePixelRatio, 2)`, enables `PCFSoftShadowMap`, color space `SRGBColorSpace`, tone mapping `ACESFilmicToneMapping`, and exposure `1.05`. Use a perspective camera with FOV `58`, near `0.1`, far `650`; set matching scene background and `Fog(COLORS.sky, 120, 430)`.

Add `HemisphereLight(0xdff9ff, 0x3f6c55, 1.8)` and one shadow-casting directional light with a 100-unit orthographic shadow camera and 1024² map.

- [ ] **Step 2: Build the Brisacoral environment**

Create a 600-unit water plane beneath the track with a `MeshStandardMaterial` using `COLORS.water`, high roughness, low metalness and 0.8 opacity. Animate it by changing material color/emissive intensity subtly with `sin(elapsed * 0.6)`; do not use reflections.

Place low-poly sand/rock island discs beneath major turns and instanced palm trunks/crowns outside road bounds. Add triangular coral-and-cream sail markers following the track direction. Every prop placement must reject positions where `track.getClosestInfo(position).onRoad` is true.

- [ ] **Step 3: Implement the camera rig**

`FollowCamera` reads the kart world position and quaternion. Transform local offsets `(0, 5.5, -10.5)` for the desired camera position and `(0, 1.2, 5)` for the look target. Apply exponential damping with lambdas `6` and `9`. Damp FOV from `58` to at most `64` based on `speedRatio`, then call `updateProjectionMatrix()` only when FOV changes by more than `0.01`.

Initialize the camera at its desired position in the constructor so the first frame does not fly in from the origin.

- [ ] **Step 4: Add lifecycle checks and commit**

Run: `pnpm test`

Expected: all current tests PASS.

Run:

```powershell
git add src/scene/GameScene.js src/scene/FollowCamera.js
git commit -m "feat: add tropical world and follow camera"
```

---

### Task 5: Compose the playable layer and browser verification

**Files:**
- Create: `src/main.js`
- Modify: `index.html`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes all public interfaces from Tasks 1–4.
- Produces a browser-playable layer with no menu.

- [ ] **Step 1: Compose runtime systems**

In `main.js`, import styles and create `GameScene`, `Track`, `PlayerKart`, `KeyboardInput`, and `FollowCamera`. Add track and kart groups to the scene. Use `THREE.Clock`; on every animation frame clamp delta, read controls, update kart, camera, water animation, and render. Register a single resize listener and dispose listeners/resources on `beforeunload`.

Wrap renderer creation in `try/catch`. On failure, set `#compatibility.dataset.visible = 'true'` with: `No pudimos iniciar WebGL. Activa la aceleración gráfica o prueba un navegador actualizado.`

- [ ] **Step 2: Add a non-menu start cue**

Show a small `BRISACORAL — PRUEBA DE MANEJO` label that fades after 2.5 seconds and a persistent compact control hint. Do not block input, show buttons or wait for interaction.

- [ ] **Step 3: Run automated verification**

Run:

```powershell
pnpm test
pnpm build
```

Expected: all tests PASS; Vite reports a successful production build and creates `dist/`.

- [ ] **Step 4: Run manual browser verification**

Run: `pnpm dev`

Open the printed local URL and verify:

1. The scene appears immediately without menu or click.
2. `W`/up accelerate, `S`/down brake and reverse, and both steering pairs work.
3. Releasing acceleration coasts and slows instead of stopping instantly.
4. Complete two full laps without crossing barriers.
5. Hold a turn into both barriers; the kart rebounds slightly and remains recoverable.
6. The camera follows with mild lag, does not shake at the seam and never flips.
7. Switch tabs while accelerating; return and confirm the throttle is released.
8. Resize from desktop to a narrow window; canvas remains full-screen and controls stay legible.
9. In browser performance tools, sample a lap and confirm frame pacing is near 60 FPS on target hardware.

- [ ] **Step 5: Commit the playable layer**

```powershell
git add src/main.js index.html src/styles.css
git commit -m "feat: deliver playable Brisacoral driving layer"
```

## Layer 1 Acceptance Gate

Do not begin drift or rivals until the user has driven this build and confirmed:

- Steering, acceleration and braking feel controllable.
- Camera lag is comfortable.
- Track width and barriers permit racing lines without trapping the kart.
- Performance is acceptable on their laptop.

Record requested tuning as explicit parameter changes in `src/config.js`; do not hide feel changes inside rendering or track code.
