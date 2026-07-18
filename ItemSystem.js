import * as THREE from 'three';
import { RaceDirector } from '../race/RaceDirector.js';

const BOX_RESPAWN_SECONDS = 4;
const BOX_ROWS = [0.12, 0.255, 0.39, 0.525, 0.66, 0.805];
const BOX_LANES = [-3.2, 3.2];
const ITEM_IDS = ['bubble', 'pearl', 'shell', 'shellshot'];

function boxPosition(track, progress, lane) {
  if (!track?.getSample) return new THREE.Vector3();
  const sample = track.getSample(progress);
  return sample.center.clone().addScaledVector(sample.side, lane).setY(1.15);
}

export class ItemSystem {
  constructor(trackOrOptions, options = {}) {
    const track = trackOrOptions?.getSample ? trackOrOptions : null;
    const settings = track ? options : (trackOrOptions ?? {});
    this.track = track;
    this.raceDirector = settings.raceDirector instanceof RaceDirector || typeof settings.raceDirector?.chooseItem === 'function'
      ? settings.raceDirector
      : null;
    this.getRacePosition = typeof settings.getRacePosition === 'function' ? settings.getRacePosition : null;
    this.random = settings.random;
    this.group = new THREE.Group();
    this.group.name = 'Toy-Box surprise boxes';
    this.inventory = new Map();
    this.events = [];
    this.boxGeometry = new THREE.OctahedronGeometry(0.72, 0);
    this.boxMaterial = new THREE.MeshStandardMaterial({
      color: 0x68e7e5,
      emissive: 0x147c92,
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.72,
      roughness: 0.35,
      flatShading: true,
    });
    this.boxes = BOX_ROWS.flatMap((progress, row) => BOX_LANES.map((lane, column) => {
      const index = row * BOX_LANES.length + column;
      const box = {
        id: `box-${index}`,
        item: ITEM_IDS[index % ITEM_IDS.length],
        progress,
        lane,
        position: boxPosition(track, progress, lane),
        active: true,
        respawn: 0,
        mesh: null,
      };
      if (settings.visuals !== false) {
        box.mesh = new THREE.Mesh(this.boxGeometry, this.boxMaterial);
        box.mesh.position.copy(box.position);
        box.mesh.rotation.set(0.25, index * 0.52, 0);
        box.mesh.castShadow = true;
        this.group.add(box.mesh);
      }
      return box;
    }));
  }

  inventoryOf(kart) {
    return this.inventory.get(kart) ?? null;
  }

  collect(kart, boxId) {
    const box = this.boxes.find((entry) => entry.id === boxId);
    if (!kart || !box || !box.active || this.inventoryOf(kart)) return null;
    const item = this.#chooseItem(kart, box.item);
    this.inventory.set(kart, item);
    box.active = false;
    box.respawn = BOX_RESPAWN_SECONDS;
    if (box.mesh) box.mesh.visible = false;
    this.events.push({ type: 'collect', item, kart, boxId });
    return item;
  }

  collectNearby(kart, radius = 2.35) {
    const position = kart?.group?.position;
    if (!position || this.inventoryOf(kart)) return null;
    const box = this.boxes.find((entry) => {
      if (!entry.active) return false;
      const dx = entry.position.x - position.x;
      const dz = entry.position.z - position.z;
      return dx * dx + dz * dz <= radius * radius;
    });
    return box ? this.collect(kart, box.id) : null;
  }

  use(kart) {
    const item = this.inventoryOf(kart);
    if (!item) return null;
    this.inventory.delete(kart);
    const event = { type: item, kart };
    this.events.push(event);
    return event;
  }

  update(rawDt) {
    const dt = Math.max(0, rawDt);
    for (const box of this.boxes) {
      if (box.active) {
        if (box.mesh) box.mesh.rotation.y += dt * 1.9;
        continue;
      }
      box.respawn = Math.max(0, box.respawn - dt);
      if (box.respawn === 0) {
        box.active = true;
        if (box.mesh) box.mesh.visible = true;
      }
    }
  }

  #chooseItem(kart, fallback) {
    if (!this.raceDirector || !this.getRacePosition) return fallback;
    try {
      const racePosition = this.getRacePosition(kart);
      if (!racePosition) return fallback;
      return this.raceDirector.chooseItem({ ...racePosition, random: this.random });
    } catch {
      return fallback;
    }
  }
}
