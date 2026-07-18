# Tropical Toy-Box Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir cajas, tres objetos originales, monedas solares y uso sencillo por jugador e IA.

**Architecture:** `ItemSystem` administra inventario y respawn; `ProjectileSystem` administra perlas mediante pool; `RaceDirector` solo elige probabilidades. Los efectos se emiten como eventos y no contienen reglas.

**Tech Stack:** Three.js 0.185.1, Vite 8.1.5, Vanilla JavaScript, Vitest 4.1.10.

## Global Constraints

- Un objeto por kart y un proyectil activo por corredor.
- `Espacio` usa el objeto; perder foco limpia la pulsación.
- Probabilidades ponderadas por posición sin teletransporte ni velocidad artificial.
- Pools fijos y geometrías/materiales compartidos.

---

### Task 1: Boxes and inventory

**Files:** Create `src/items/ItemSystem.js`, `tests/itemSystem.test.js`; modify `src/input/KeyboardInput.js`, `src/main.js`, `src/ui/HUD.js`.

**Interfaces:** `ItemSystem.collect(kart,boxId)`, `use(kart)`, `update(dt)`, `inventoryOf(kart)`; boxes respawn after `4` seconds.

- [ ] Test single inventory, ignored collection while full, use-and-clear, and respawn.
- [ ] Confirm RED for missing module.
- [ ] Implement six two-lane box rows and edge-triggered `Space` input (`useItem` true for one frame).
- [ ] Render rotating translucent octahedrons and HUD item icon.
- [ ] Run tests/build and commit `feat: add surprise boxes and inventory`.

### Task 2: Item effects and shields

**Files:** Create `src/items/ProjectileSystem.js`, `tests/projectileSystem.test.js`; modify `src/kart/PlayerKart.js`, `src/race/RivalKart.js`, `src/main.js`.

**Interfaces:** item IDs `bubble`, `pearl`, `shell`; `ProjectileSystem.fire(owner)`, `update(dt,karts)`, hit event `{target,owner}`.

- [ ] Test bubble duration/cap, shell blocking one hit, pearl expiry, pearl hit and no self-hit.
- [ ] Confirm RED.
- [ ] Implement pooled pearl motion along nearest track tangent, `6`-second shield and `0.75`-second hit spin.
- [ ] Integrate item use for player and timed AI decisions.
- [ ] Run suite/build and commit `feat: add turbo pearl and shell items`.

### Task 3: Solar coins

**Files:** Create `src/items/CoinSystem.js`, `tests/coinSystem.test.js`; modify `src/main.js`, `src/ui/HUD.js`, `src/kart/PlayerKart.js`.

**Interfaces:** `CoinSystem.collect(kart,coinId)`, `drop(kart,count)`, `update(dt)`; count range `0..10`; max-speed bonus `0.22` units per coin.

- [ ] Test cap at ten, speed bonus, loss of at most three and recycled dropped coins.
- [ ] Confirm RED.
- [ ] Implement five coin arcs plus a pool of fifteen dropped coins.
- [ ] Add HUD counter and collect/loss events.
- [ ] Run suite/build and commit `feat: add solar coin risk reward`.

### Task 4: Race director

**Files:** Create `src/race/RaceDirector.js`, `tests/raceDirector.test.js`; modify `src/items/ItemSystem.js`.

**Interfaces:** `chooseItem({position,total,random}): 'bubble'|'pearl'|'shell'` with injected deterministic random.

- [ ] Test leaders rarely receive bubble and last place receives bubble/shell more often across fixed samples.
- [ ] Confirm RED, implement weighted tables and keep output deterministic under injected values.
- [ ] Run suite and commit `feat: balance item distribution by position`.

## Acceptance Gate

Complete three browser races, use every item, verify shield feedback, collect ten coins, lose coins to a pearl and confirm AI uses items without leaving the track.
