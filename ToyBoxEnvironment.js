import * as THREE from 'three';
import { COLORS } from '../config.js';

const TAU = Math.PI * 2;

function matte(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...options });
}

function headingOf(sample) {
  return Math.atan2(sample.tangent.x, sample.tangent.z);
}

/**
 * Static scenery deliberately lives outside Track: it is cosmetic, can be
 * reduced without changing a lap and keeps a small, shared resource palette.
 */
export class ToyBoxEnvironment {
  constructor(track) {
    this.track = track;
    this.group = new THREE.Group();
    this.group.name = 'Tropical Toy-Box environment';
    this.optionalGroups = [];
    this.animated = [];
    this.quality = 'high';
    this.#createResources();
    this.#addWater();
    this.#addIslands();
    this.#addCoralTunnel();
    this.#addStartArch();
    this.#addPalms();
    this.#addWindmills();
    this.#addFishBalloons();
    this.#addBoats();
  }

  #createResources() {
    this.geometries = {
      water: new THREE.PlaneGeometry(620, 620, 8, 8),
      island: new THREE.CylinderGeometry(1, 1.14, 1, 10),
      rock: new THREE.DodecahedronGeometry(1, 0),
      coral: new THREE.IcosahedronGeometry(1, 1),
      trunk: new THREE.CylinderGeometry(0.32, 0.58, 1, 6),
      leaf: new THREE.ConeGeometry(0.72, 1, 4),
      ring: new THREE.TorusGeometry(1, 0.065, 5, 12),
      pole: new THREE.CylinderGeometry(0.08, 0.11, 1, 5),
      blade: new THREE.ConeGeometry(0.42, 1, 3),
      balloon: new THREE.SphereGeometry(1, 9, 7),
      tail: new THREE.ConeGeometry(0.48, 0.95, 3),
      hull: new THREE.BoxGeometry(1, 0.42, 2.15),
      sign: new THREE.BoxGeometry(1, 1, 0.18),
    };
    this.materials = {
      water: matte(COLORS.water, { transparent: true, opacity: 0.93, emissive: 0x075c66, emissiveIntensity: 0.16 }),
      sand: matte(COLORS.sand),
      foam: matte(0xf5fff4, { emissive: 0xa7f5ed, emissiveIntensity: 0.26 }),
      coral: matte(COLORS.coral),
      coralDark: matte(0xd8507e),
      cream: matte(0xfff1c2),
      mint: matte(0x62cdbd),
      palm: matte(COLORS.palm),
      wood: matte(0x9c643e),
      sunny: matte(0xffc94a),
      violet: matte(0x9a77df),
      fish: matte(0x6c9fe8),
    };
  }

  #mesh(geometry, material) {
    return new THREE.Mesh(geometry, material);
  }

  #outside(sample, sideSign, distance) {
    return sample.center.clone().addScaledVector(sample.side, sideSign * distance);
  }

  #addWater() {
    const water = this.#mesh(this.geometries.water, this.materials.water);
    water.name = 'toybox water';
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2.35;
    water.receiveShadow = true;
    this.group.add(water);

    const foam = new THREE.Group();
    foam.name = 'foam coastline';
    for (let index = 0; index < 16; index += 1) {
      const sample = this.track.getSample((index + 0.18) / 16);
      const ring = this.#mesh(this.geometries.ring, this.materials.foam);
      ring.position.copy(this.#outside(sample, index % 2 ? -1 : 1, 31 + (index % 3) * 3));
      ring.position.y = -2.19;
      ring.rotation.x = -Math.PI / 2;
      ring.scale.setScalar(4.2 + (index % 3));
      foam.add(ring);
    }
    this.group.add(foam);
    this.optionalGroups.push(foam);
  }

  #addIslands() {
    for (let index = 0; index < 10; index += 1) {
      const sample = this.track.getSample((index + 0.11) / 10);
      const island = new THREE.Group();
      island.name = `layered island ${index}`;
      island.position.copy(this.#outside(sample, index % 2 ? -1 : 1, 34 + (index % 3) * 7));
      island.position.y = -2.1;
      island.rotation.y = index * 0.71;

      const base = this.#mesh(this.geometries.island, this.materials.sand);
      base.scale.set(12 + (index % 3) * 2, 3.2, 10 + (index % 2) * 3);
      base.receiveShadow = true;
      island.add(base);
      const top = this.#mesh(this.geometries.island, this.materials.cream);
      top.position.y = 1.1;
      top.scale.set(7.8 + (index % 2), 0.7, 6.8 + (index % 3));
      island.add(top);
      const rock = this.#mesh(this.geometries.rock, index % 2 ? this.materials.coralDark : this.materials.coral);
      rock.position.set((index % 3 - 1) * 4.2, 3.1, (index % 2 ? -1 : 1) * 2.5);
      rock.rotation.set(index * 0.21, index * 0.48, 0.16);
      rock.scale.set(2.5 + (index % 2), 3.6, 2.3);
      rock.castShadow = index % 3 === 0;
      island.add(rock);
      this.group.add(island);
      if (index > 5) this.optionalGroups.push(island);
    }
  }

  #addCoralTunnel() {
    const tunnel = new THREE.Group();
    tunnel.name = 'coral tunnel';
    const sample = this.track.getSample(0.61);
    tunnel.position.copy(sample.center);
    tunnel.rotation.y = headingOf(sample);
    for (let index = 0; index < 3; index += 1) {
      const arch = this.#mesh(this.geometries.ring, index === 1 ? this.materials.cream : this.materials.coral);
      arch.position.set(0, 7.1, (index - 1) * 4.1);
      arch.scale.setScalar(13.1);
      arch.castShadow = index === 1;
      tunnel.add(arch);
    }
    for (let index = 0; index < 8; index += 1) {
      const bud = this.#mesh(this.geometries.coral, index % 2 ? this.materials.coralDark : this.materials.sunny);
      const angle = (index / 8) * TAU;
      bud.position.set(Math.cos(angle) * 12.8, 7.1 + Math.sin(angle) * 12.8, (index % 2 ? -1 : 1) * 1.8);
      bud.scale.setScalar(0.72);
      tunnel.add(bud);
    }
    this.group.add(tunnel);
  }

  #addStartArch() {
    const arch = new THREE.Group();
    arch.name = 'Toy-Box start arch';
    const sample = this.track.getSample(0);
    arch.position.copy(sample.center);
    arch.rotation.y = headingOf(sample);
    for (const side of [-1, 1]) {
      const post = this.#mesh(this.geometries.trunk, this.materials.mint);
      post.position.set(side * 13.2, 3.3, 0);
      post.scale.set(1.2, 6.6, 1.2);
      post.castShadow = true;
      arch.add(post);
    }
    const banner = this.#mesh(this.geometries.sign, this.materials.sunny);
    banner.position.set(0, 7.05, 0);
    banner.scale.set(16.4, 2.25, 1);
    banner.castShadow = true;
    arch.add(banner);
    for (let index = -3; index <= 3; index += 1) {
      const tile = this.#mesh(this.geometries.coral, index % 2 ? this.materials.coral : this.materials.cream);
      tile.position.set(index * 2.05, 7.1, 0.18);
      tile.scale.set(0.48, 0.48, 0.25);
      arch.add(tile);
    }
    this.group.add(arch);
  }

  #addPalms() {
    const palms = new THREE.Group();
    palms.name = 'swaying toy palms';
    for (let index = 0; index < 14; index += 1) {
      const sample = this.track.getSample((index + 0.36) / 14);
      const palm = new THREE.Group();
      palm.position.copy(this.#outside(sample, index % 2 ? -1 : 1, 24 + (index % 4) * 2.5));
      palm.rotation.y = index * 0.94;
      const trunk = this.#mesh(this.geometries.trunk, this.materials.wood);
      trunk.position.y = 3.1;
      trunk.scale.set(1, 6.2, 1);
      trunk.castShadow = index % 3 === 0;
      palm.add(trunk);
      const crown = new THREE.Group();
      crown.position.y = 6.1;
      for (let leaf = 0; leaf < 5; leaf += 1) {
        const frond = this.#mesh(this.geometries.leaf, this.materials.palm);
        frond.position.set(Math.sin(leaf * TAU / 5) * 1.25, -0.34, Math.cos(leaf * TAU / 5) * 1.25);
        frond.rotation.set(Math.PI / 2.6, leaf * TAU / 5, Math.PI / 2.8);
        crown.add(frond);
      }
      palm.add(crown);
      palms.add(palm);
      this.animated.push({ type: 'palm', object: crown, phase: index * 0.73 });
    }
    this.group.add(palms);
  }

  #addWindmills() {
    const windmills = new THREE.Group();
    windmills.name = 'windmills';
    for (let index = 0; index < 4; index += 1) {
      const sample = this.track.getSample((index + 0.18) / 4);
      const mill = new THREE.Group();
      mill.position.copy(this.#outside(sample, index % 2 ? -1 : 1, 40));
      const mast = this.#mesh(this.geometries.pole, this.materials.cream);
      mast.position.y = 6;
      mast.scale.set(3.8, 12, 3.8);
      mill.add(mast);
      const rotor = new THREE.Group();
      rotor.position.y = 10.8;
      for (let blade = 0; blade < 4; blade += 1) {
        const part = this.#mesh(this.geometries.blade, blade % 2 ? this.materials.mint : this.materials.coral);
        part.position.y = 1.2;
        part.rotation.z = blade * Math.PI / 2;
        part.scale.set(1, 2.5, 0.28);
        rotor.add(part);
      }
      mill.add(rotor);
      windmills.add(mill);
      this.animated.push({ type: 'rotor', object: rotor, phase: index * 1.17 });
    }
    this.group.add(windmills);
    this.optionalGroups.push(windmills);
  }

  #addFishBalloons() {
    const balloons = new THREE.Group();
    balloons.name = 'original fish balloons';
    for (let index = 0; index < 6; index += 1) {
      const sample = this.track.getSample((index + 0.07) / 6);
      const fish = new THREE.Group();
      fish.position.copy(this.#outside(sample, index % 2 ? -1 : 1, 47 + (index % 2) * 7));
      fish.position.y = 18 + (index % 3) * 2;
      const body = this.#mesh(this.geometries.balloon, index % 2 ? this.materials.violet : this.materials.fish);
      body.scale.set(2.5, 1.35, 1.45);
      fish.add(body);
      const tail = this.#mesh(this.geometries.tail, this.materials.sunny);
      tail.position.z = 1.8;
      tail.rotation.x = Math.PI / 2;
      fish.add(tail);
      const string = this.#mesh(this.geometries.pole, this.materials.cream);
      string.position.y = -4.2;
      string.scale.set(0.42, 7.4, 0.42);
      fish.add(string);
      balloons.add(fish);
      this.animated.push({ type: 'float', object: fish, baseY: fish.position.y, phase: index * 1.31 });
    }
    this.group.add(balloons);
    this.optionalGroups.push(balloons);
  }

  #addBoats() {
    const boats = new THREE.Group();
    boats.name = 'small toy boats';
    for (let index = 0; index < 5; index += 1) {
      const sample = this.track.getSample((index + 0.28) / 5);
      const boat = new THREE.Group();
      boat.position.copy(this.#outside(sample, index % 2 ? -1 : 1, 54));
      boat.position.y = -0.7;
      boat.rotation.y = headingOf(sample) + (index % 2 ? Math.PI : 0);
      const hull = this.#mesh(this.geometries.hull, index % 2 ? this.materials.coral : this.materials.mint);
      hull.position.y = 0.45;
      hull.scale.set(2.2, 1, 1.8);
      boat.add(hull);
      const mast = this.#mesh(this.geometries.pole, this.materials.wood);
      mast.position.y = 2.1;
      mast.scale.set(1.6, 4, 1.6);
      boat.add(mast);
      const sail = this.#mesh(this.geometries.blade, this.materials.cream);
      sail.position.set(0.55, 3.1, 0);
      sail.rotation.z = -Math.PI / 2;
      sail.scale.set(1.8, 2.6, 0.3);
      boat.add(sail);
      boats.add(boat);
      this.animated.push({ type: 'boat', object: boat, baseY: boat.position.y, phase: index * 0.89 });
    }
    this.group.add(boats);
    this.optionalGroups.push(boats);
  }

  update(_dt, elapsed) {
    this.materials.water.emissiveIntensity = 0.14 + Math.sin(elapsed * 0.62) * 0.025;
    for (const entry of this.animated) {
      const wave = Math.sin(elapsed * (entry.type === 'rotor' ? 3.6 : 1.4) + entry.phase);
      if (entry.type === 'palm') entry.object.rotation.z = wave * 0.09;
      if (entry.type === 'rotor') entry.object.rotation.z = elapsed * 3.6 + entry.phase;
      if (entry.type === 'float') {
        entry.object.position.y = entry.baseY + wave * 0.85;
        entry.object.rotation.z = wave * 0.1;
      }
      if (entry.type === 'boat') {
        entry.object.position.y = entry.baseY + wave * 0.22;
        entry.object.rotation.z = wave * 0.055;
      }
    }
  }

  get objectCount() {
    let count = 0;
    this.group.traverse(() => { count += 1; });
    return count;
  }

  setQuality(level = 'high') {
    this.quality = level;
    const isLow = level === 'low';
    for (const group of this.optionalGroups) group.visible = !isLow;
  }
}
