import * as THREE from 'three';

export const KART_EFFECT_CAPACITY = 72;

const EFFECT_TYPES = new Set(['smoke', 'dust', 'spark', 'coin', 'impact', 'streak']);
const planeGeometry = new THREE.PlaneGeometry(1, 1);
const burstGeometry = new THREE.IcosahedronGeometry(0.5, 0);
const LIFETIMES = Object.freeze({ smoke: 0.62, dust: 0.46, spark: 0.3, coin: 0.52, impact: 0.42, streak: 0.22 });
const INITIAL_SCALES = Object.freeze({ smoke: 0.42, dust: 0.32, spark: 0.16, coin: 0.28, impact: 0.3, streak: 0.16 });
const SCALE_RATES = Object.freeze({ smoke: 1.45, dust: 1.1, spark: 0.34, coin: 0.24, impact: 1.7, streak: 0.35 });
const OPACITIES = Object.freeze({ smoke: 0.48, dust: 0.55, spark: 0.9, coin: 0.9, impact: 0.9, streak: 0.9 });
const MATERIAL_VARIANT_COLORS = Object.freeze({
  smoke: Object.freeze([['foam', 0xf5fff4], ['sand', 0xffd999]]),
  dust: Object.freeze([['sand', 0xffd999], ['foam', 0xf5fff4]]),
  spark: Object.freeze([['blue', 0x5bc8ff], ['orange', 0xff8c42], ['pink', 0xffd2f2]]),
  coin: Object.freeze([['gold', 0xffd766]]),
  impact: Object.freeze([['coral', 0xff9a8b], ['cyan', 0x8ff7ff], ['pink', 0xff80b5]]),
  streak: Object.freeze([['blue', 0x5bc8ff], ['orange', 0xff8c42], ['foam', 0xf5fff4]]),
});
const requestedColorScratch = new THREE.Color();
const variantColorScratch = new THREE.Color();

function createMaterial(type, color) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: OPACITIES[type],
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

const MATERIAL_PALETTE = Object.freeze(Object.fromEntries(Object.entries(MATERIAL_VARIANT_COLORS).map(([type, variants]) => [type, Object.freeze(
  variants.map(([name, color]) => Object.freeze({ name, color, material: createMaterial(type, color) })),
)])));
const PALETTE_MATERIALS = Object.freeze(Object.values(MATERIAL_PALETTE).flatMap((variants) => variants.map((variant) => variant.material)));

function geometryFor(type) {
  return type === 'coin' || type === 'impact' ? burstGeometry : planeGeometry;
}

function colorDistance(first, second) {
  return (first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2;
}

function materialFor(type, color) {
  const requested = color?.isColor ? color : requestedColorScratch.set(color);
  const variants = MATERIAL_PALETTE[type];
  let selected = variants[0];
  let selectedDistance = Infinity;
  for (const variant of variants) {
    const distance = colorDistance(requested, variantColorScratch.set(variant.color));
    if (distance < selectedDistance) {
      selected = variant;
      selectedDistance = distance;
    }
  }
  return selected.material;
}

function velocityFor(slot, type, sequence) {
  const angle = sequence * 2.399963229728653;
  const sideways = type === 'streak' ? 0.45 : 1;
  slot.velocity.set(Math.cos(angle) * sideways, type === 'spark' || type === 'coin' ? 2.2 : 0.75, Math.sin(angle) * sideways);
  if (type === 'streak') slot.velocity.z -= 7.2;
  if (type === 'impact') slot.velocity.multiplyScalar(2.3);
  if (type === 'smoke') slot.velocity.multiplyScalar(0.52);
}

export class KartEffects {
  constructor({ visuals = true } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'Toy-Box pooled racing effects';
    this.sequence = 0;
    this.materials = PALETTE_MATERIALS;
    this.pool = Array.from({ length: KART_EFFECT_CAPACITY }, () => this.#createSlot(visuals));
    this.quality = 'high';
    this.activeBudget = KART_EFFECT_CAPACITY;
  }

  get activeCount() {
    let count = 0;
    for (const slot of this.pool) count += Number(slot.active);
    return count;
  }

  setQuality(level = 'high') {
    this.quality = level;
    this.activeBudget = level === 'low' ? 28 : level === 'medium' ? 44 : KART_EFFECT_CAPACITY;
    for (let index = this.activeBudget; index < this.pool.length; index += 1) this.#deactivate(this.pool[index]);
  }

  emit(type, position, color = 0xffffff) {
    const effectType = EFFECT_TYPES.has(type) ? type : 'smoke';
    const slot = this.#nextSlot();
    this.sequence += 1;
    slot.active = true;
    slot.type = effectType;
    slot.age = 0;
    slot.life = LIFETIMES[effectType];
    slot.order = this.sequence;
    slot.scale = INITIAL_SCALES[effectType];
    slot.position.copy(position ?? this.group.position);
    velocityFor(slot, effectType, this.sequence);
    if (slot.mesh) {
      slot.mesh.geometry = geometryFor(effectType);
      slot.mesh.material = materialFor(effectType, color);
      slot.mesh.position.copy(slot.position);
      slot.mesh.rotation.set(0, this.sequence * 0.91, effectType === 'streak' ? Math.PI / 2 : 0);
      slot.mesh.scale.setScalar(slot.scale);
      slot.mesh.visible = true;
    }
    return slot;
  }

  update(rawDt) {
    const dt = Math.max(0, rawDt);
    for (const slot of this.pool) {
      if (!slot.active) continue;
      slot.age += dt;
      if (slot.age >= slot.life) {
        this.#deactivate(slot);
        continue;
      }
      slot.position.addScaledVector(slot.velocity, dt);
      slot.velocity.y -= (slot.type === 'spark' || slot.type === 'coin') ? 4.2 * dt : 0;
      slot.scale += SCALE_RATES[slot.type] * dt;
      if (!slot.mesh) continue;
      slot.mesh.position.copy(slot.position);
      slot.mesh.scale.setScalar(slot.scale);
      slot.mesh.rotation.y += dt * (slot.type === 'coin' ? 9 : 2.4);
    }
  }

  #createSlot(visuals) {
    let mesh = null;
    if (visuals) {
      mesh = new THREE.Mesh(planeGeometry, materialFor('smoke', 0xffffff));
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    return {
      active: false,
      type: 'smoke',
      age: 0,
      life: 0,
      order: 0,
      scale: 0,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      mesh,
    };
  }

  #nextSlot() {
    for (let index = 0; index < this.activeBudget; index += 1) {
      if (!this.pool[index].active) return this.pool[index];
    }
    let oldest = this.pool[0];
    for (let index = 1; index < this.activeBudget; index += 1) {
      if (this.pool[index].order < oldest.order) oldest = this.pool[index];
    }
    return oldest;
  }

  #deactivate(slot) {
    slot.active = false;
    if (slot.mesh) slot.mesh.visible = false;
  }
}
