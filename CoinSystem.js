import * as THREE from 'three';

const MAX_COINS = 10;
const SPEED_BONUS_PER_COIN = 0.22;
const DROPPED_POOL_SIZE = 15;
const COLLECT_RADIUS = 2.25;
const RESPAWN_SECONDS = 4;
const DROPPED_LIFETIME = 4.5;
const MAX_EVENT_QUEUE = 24;

const coinGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.12, 10);
const coinMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd75a,
  emissive: 0x9a5710,
  emissiveIntensity: 0.46,
  roughness: 0.42,
  flatShading: true,
});
const coinRingGeometry = new THREE.TorusGeometry(0.22, 0.055, 5, 10);
const coinRingMaterial = new THREE.MeshStandardMaterial({ color: 0xfff3ad, emissive: 0xffbd32, emissiveIntensity: 0.7, flatShading: true });

function optionSet(trackOrOptions, options) {
  if (trackOrOptions?.getSample) return { track: trackOrOptions, ...options };
  return { track: null, ...(trackOrOptions ?? {}) };
}

function createMesh(visuals) {
  if (!visuals) return null;
  const coin = new THREE.Group();
  const disk = new THREE.Mesh(coinGeometry, coinMaterial);
  disk.rotation.x = Math.PI / 2;
  disk.castShadow = true;
  const ring = new THREE.Mesh(coinRingGeometry, coinRingMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 0.07;
  coin.add(disk, ring);
  return coin;
}

export class CoinSystem {
  constructor(trackOrOptions = null, options = {}) {
    const { track, visuals = true } = optionSet(trackOrOptions, options);
    this.track = track;
    this.group = new THREE.Group();
    this.group.name = 'Toy-Box solar coins';
    this.events = [];
    this.coins = [];
    this.droppedCoins = [];
    this.nearbyCollectors = new Set();
    this.collectOffset = new THREE.Vector3();
    this.#createTrackArcs(visuals);
    this.#createDroppedPool(visuals);
  }

  speedBonusOf(kart) {
    return Math.min(Math.max(kart?.coinCount ?? 0, 0), MAX_COINS) * SPEED_BONUS_PER_COIN;
  }

  consumeLatestEvent() {
    return this.consumeEvents(1)[0] ?? null;
  }

  consumeEvents(limit = Infinity) {
    const count = Math.max(0, Math.min(this.events.length, Number.isFinite(limit) ? Math.floor(limit) : this.events.length));
    return this.events.splice(0, count);
  }

  collect(kart, coinId) {
    const coin = this.coins.find((entry) => entry.id === coinId) ?? this.droppedCoins.find((entry) => entry.id === coinId);
    if (!kart || !coin?.active) return null;
    const before = Math.min(Math.max(kart.coinCount ?? 0, 0), MAX_COINS);
    kart.coinCount = Math.min(MAX_COINS, before + 1);
    if (kart.coinCount === before) return kart.coinCount;
    coin.active = false;
    coin.respawn = coin.dropped ? 0 : RESPAWN_SECONDS;
    coin.age = 0;
    if (coin.mesh) coin.mesh.visible = false;
    this.#emitEvent({ type: 'coin-collect', kart, count: kart.coinCount, coinId });
    return kart.coinCount;
  }

  collectNearby(kart, radius = COLLECT_RADIUS) {
    if (!kart?.group) return null;
    if (this.nearbyCollectors.has(kart)) return null;
    const radiusSquared = radius * radius;
    for (const coin of this.coins) {
      if (coin.active && this.#onRoadDistanceSquared(coin.position, kart.group.position) <= radiusSquared) {
        const count = this.collect(kart, coin.id);
        if (count !== null) this.nearbyCollectors.add(kart);
        return count;
      }
    }
    for (const coin of this.droppedCoins) {
      if (coin.active && this.#onRoadDistanceSquared(coin.position, kart.group.position) <= radiusSquared) {
        const count = this.collect(kart, coin.id);
        if (count !== null) this.nearbyCollectors.add(kart);
        return count;
      }
    }
    return null;
  }

  drop(kart, count) {
    if (!kart?.group) return 0;
    const previous = Math.min(Math.max(kart.coinCount ?? 0, 0), MAX_COINS);
    const lost = Math.min(previous, Math.max(0, Math.min(3, Math.floor(count))));
    if (lost === 0) return 0;
    kart.coinCount = previous - lost;
    const heading = kart.group.rotation.y ?? 0;
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);
    for (let index = 0; index < lost; index += 1) {
      const coin = this.#allocateDroppedCoin();
      const spread = (index - (lost - 1) * 0.5) * 0.9;
      coin.active = true;
      coin.age = 0;
      coin.position.copy(kart.group.position);
      coin.position.y = 0.58;
      coin.velocity.set(-forwardX * (2.3 + index * 0.35) + Math.cos(heading) * spread, 2.8 + index * 0.22, -forwardZ * (2.3 + index * 0.35) - Math.sin(heading) * spread);
      if (coin.mesh) {
        coin.mesh.visible = true;
        coin.mesh.position.copy(coin.position);
      }
    }
    this.#emitEvent({ type: 'coin-loss', kart, count: lost, remaining: kart.coinCount });
    return lost;
  }

  update(dt) {
    const safeDt = Math.max(0, dt);
    this.nearbyCollectors.clear();
    for (const coin of this.coins) {
      if (!coin.active) {
        coin.respawn -= safeDt;
        if (coin.respawn <= 0) {
          coin.active = true;
          coin.respawn = 0;
          if (coin.mesh) coin.mesh.visible = true;
        }
      }
      this.#animateCoin(coin, safeDt);
    }
    for (const coin of this.droppedCoins) {
      if (!coin.active) continue;
      coin.age += safeDt;
      if (coin.age >= DROPPED_LIFETIME) {
        coin.active = false;
        if (coin.mesh) coin.mesh.visible = false;
        continue;
      }
      coin.velocity.y -= 7.6 * safeDt;
      coin.position.addScaledVector(coin.velocity, safeDt);
      if (coin.position.y <= 0.46) {
        coin.position.y = 0.46;
        coin.velocity.y = Math.abs(coin.velocity.y) * 0.24;
        coin.velocity.x *= 0.82;
        coin.velocity.z *= 0.82;
      }
      this.#animateCoin(coin, safeDt);
    }
  }

  #createTrackArcs(visuals) {
    const arcStarts = [0.085, 0.255, 0.435, 0.63, 0.82];
    let id = 0;
    for (const arcStart of arcStarts) {
      for (let step = 0; step < 5; step += 1) {
        const progress = arcStart + step * 0.0065;
        const sample = this.track?.getSample?.(progress);
        const position = sample?.center?.clone?.() ?? new THREE.Vector3((id % 5) * 2, 0, Math.floor(id / 5) * 2);
        if (sample) position.addScaledVector(sample.side, Math.sin(step * 0.8) * 1.25);
        position.y = 0.76 + Math.sin((step / 4) * Math.PI) * 0.68;
        const mesh = createMesh(visuals);
        if (mesh) {
          mesh.position.copy(position);
          this.group.add(mesh);
        }
        this.coins.push({ id: `solar-${id++}`, active: true, dropped: false, position, home: position.clone(), velocity: new THREE.Vector3(), age: step * 0.18, respawn: 0, mesh });
      }
    }
  }

  #createDroppedPool(visuals) {
    for (let index = 0; index < DROPPED_POOL_SIZE; index += 1) {
      const mesh = createMesh(visuals);
      if (mesh) {
        mesh.visible = false;
        this.group.add(mesh);
      }
      this.droppedCoins.push({ id: `dropped-${index}`, active: false, dropped: true, position: new THREE.Vector3(), home: new THREE.Vector3(), velocity: new THREE.Vector3(), age: 0, respawn: 0, mesh });
    }
  }

  #allocateDroppedCoin() {
    const available = this.droppedCoins.find((entry) => !entry.active);
    if (available) return available;
    return this.droppedCoins.reduce((oldest, entry) => (entry.age > oldest.age ? entry : oldest));
  }

  #emitEvent(event) {
    if (this.events.length >= MAX_EVENT_QUEUE) this.events.splice(0, this.events.length - MAX_EVENT_QUEUE + 1);
    this.events.push(event);
  }

  #onRoadDistanceSquared(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz;
  }

  #animateCoin(coin, dt) {
    coin.age += dt;
    if (!coin.active || !coin.mesh) return;
    if (!coin.dropped) {
      coin.mesh.position.copy(coin.home);
      coin.mesh.position.y += Math.sin(coin.age * 3.2) * 0.12;
    } else {
      coin.mesh.position.copy(coin.position);
    }
    coin.mesh.rotation.y += dt * 5.5;
    coin.mesh.rotation.z = Math.sin(coin.age * 2.6) * 0.22;
  }
}

export const COIN_RULES = { MAX_COINS, SPEED_BONUS_PER_COIN, DROPPED_POOL_SIZE, MAX_EVENT_QUEUE };
