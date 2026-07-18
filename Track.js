import * as THREE from 'three';
import { COLORS, KART_PHYSICS } from '../config.js';
import { TrackFeatures } from './TrackFeatures.js';

const SAMPLE_COUNT = 512;
const ROAD_WIDTH = 11;

const TRACK_POINTS = [
  [0, 0, 72], [48, 0, 68], [94, 0, 45], [112, 0, 6],
  [92, 0, -42], [51, 0, -72], [4, 0, -78], [-45, 0, -67],
  [-94, 0, -38], [-110, 0, 2], [-82, 0, 42], [-38, 0, 58],
];

function createRibbon(samples, halfWidth, y, material, extend = 0) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= SAMPLE_COUNT; i += 1) {
    const sample = samples[i % SAMPLE_COUNT];
    const width = halfWidth + extend;
    const left = sample.center.clone().addScaledVector(sample.side, -width);
    const right = sample.center.clone().addScaledVector(sample.side, width);
    positions.push(left.x, y, left.z, right.x, y, right.z);
    uvs.push(0, i / 10, 1, i / 10);
    if (i < SAMPLE_COUNT) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function createPaintedCurb(samples, sideSign, material) {
  const positions = [];
  const colors = [];
  const indices = [];
  const coral = new THREE.Color(COLORS.coral);
  const cream = new THREE.Color(0xfff1c2);
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const a = samples[index];
    const b = samples[(index + 1) % SAMPLE_COUNT];
    const innerA = a.center.clone().addScaledVector(a.side, sideSign * (ROAD_WIDTH - 0.72));
    const outerA = a.center.clone().addScaledVector(a.side, sideSign * (ROAD_WIDTH - 0.06));
    const innerB = b.center.clone().addScaledVector(b.side, sideSign * (ROAD_WIDTH - 0.72));
    const outerB = b.center.clone().addScaledVector(b.side, sideSign * (ROAD_WIDTH - 0.06));
    const vertex = index * 4;
    positions.push(
      innerA.x, 0.035, innerA.z, outerA.x, 0.035, outerA.z,
      innerB.x, 0.035, innerB.z, outerB.x, 0.035, outerB.z,
    );
    const color = Math.floor(index / 8) % 2 === 0 ? coral : cream;
    for (let count = 0; count < 4; count += 1) colors.push(color.r, color.g, color.b);
    indices.push(vertex, vertex + 1, vertex + 2, vertex + 2, vertex + 1, vertex + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const curb = new THREE.Mesh(geometry, material);
  curb.name = sideSign < 0 ? 'painted left curb' : 'painted right curb';
  curb.receiveShadow = true;
  return curb;
}

export class Track {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Brisacoral circuit';
    this.width = ROAD_WIDTH;
    this.curve = new THREE.CatmullRomCurve3(
      TRACK_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      true,
      'catmullrom',
      0.32,
    );
    this.samples = Array.from({ length: SAMPLE_COUNT }, (_, index) => this.#sampleCurve(index / SAMPLE_COUNT));
    this.#buildMeshes();
  }

  #sampleCurve(t) {
    const center = this.curve.getPointAt(t);
    const tangent = this.curve.getTangentAt(t).setY(0).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
    return { t, center, tangent, side, width: ROAD_WIDTH };
  }

  getSample(t) {
    const wrapped = ((t % 1) + 1) % 1;
    return this.#sampleCurve(wrapped);
  }

  getClosestInfo(position) {
    let closest = this.samples[0];
    let closestDistance = Infinity;
    for (const sample of this.samples) {
      const dx = position.x - sample.center.x;
      const dz = position.z - sample.center.z;
      const distance = dx * dx + dz * dz;
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = sample;
      }
    }

    const offset = position.clone().sub(closest.center);
    const signedDistance = offset.dot(closest.side);
    return {
      ...closest,
      center: closest.center.clone(),
      tangent: closest.tangent.clone(),
      side: closest.side.clone(),
      signedDistance,
      onRoad: Math.abs(signedDistance) <= ROAD_WIDTH - 0.7,
    };
  }

  constrain(position, velocity) {
    const info = this.getClosestInfo(position);
    const limit = info.width + 0.3;
    if (Math.abs(info.signedDistance) <= limit) {
      return {
        position: position.clone(),
        velocity: velocity.clone(),
        collided: false,
        info,
        outwardSpeed: 0,
      };
    }

    const sideSign = Math.sign(info.signedDistance);
    const constrainedPosition = info.center.clone().addScaledVector(info.side, sideSign * limit);
    constrainedPosition.y = position.y;
    const constrainedVelocity = velocity.clone();
    const outwardSpeed = Math.max(constrainedVelocity.dot(info.side) * sideSign, 0);
    if (outwardSpeed > 0) {
      constrainedVelocity.addScaledVector(info.side, -sideSign * outwardSpeed * (1 + KART_PHYSICS.boundaryBounce));
    }
    return {
      position: constrainedPosition,
      velocity: constrainedVelocity,
      collided: true,
      info,
      outwardSpeed,
    };
  }

  #buildMeshes() {
    const shoulder = createRibbon(
      this.samples,
      ROAD_WIDTH,
      -0.13,
      new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 1, flatShading: true }),
      2.2,
    );
    const road = createRibbon(
      this.samples,
      ROAD_WIDTH,
      0,
      new THREE.MeshStandardMaterial({ color: COLORS.asphalt, roughness: 0.92, flatShading: true }),
    );
    this.group.add(shoulder, road);
    const curbMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.83, flatShading: true });
    this.group.add(
      createPaintedCurb(this.samples, -1, curbMaterial),
      createPaintedCurb(this.samples, 1, curbMaterial),
    );
    this.#addDirectionArrows();
    this.features = new TrackFeatures(this);
    this.group.add(this.features.group);

    const barrierGeometry = new THREE.DodecahedronGeometry(1, 0);
    const coral = new THREE.MeshStandardMaterial({ color: COLORS.coral, roughness: 0.86, flatShading: true });
    const cream = new THREE.MeshStandardMaterial({ color: 0xfff1c2, roughness: 0.9, flatShading: true });
    for (let index = 0; index < SAMPLE_COUNT; index += 5) {
      const sample = this.samples[index];
      for (const sideSign of [-1, 1]) {
        const barrier = new THREE.Mesh(barrierGeometry, index % 10 === 0 ? coral : cream);
        barrier.scale.set(1.35, 0.78, 0.62);
        barrier.position.copy(sample.center).addScaledVector(sample.side, sideSign * (ROAD_WIDTH + 1.55));
        barrier.position.y = 0.45;
        barrier.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
        barrier.castShadow = index % 20 === 0;
        barrier.receiveShadow = true;
        this.group.add(barrier);
      }
    }

    const start = this.getSample(0);
    const tileGeometry = new THREE.BoxGeometry(ROAD_WIDTH * 2, 0.055, 1.1);
    for (let i = -3; i <= 3; i += 1) {
      const tile = new THREE.Mesh(tileGeometry, i % 2 === 0 ? coral : cream);
      tile.position.copy(start.center).addScaledVector(start.tangent, i * 1.1);
      tile.position.y = 0.045;
      tile.rotation.y = Math.atan2(start.tangent.x, start.tangent.z);
      this.group.add(tile);
    }
  }

  #addDirectionArrows() {
    const arrowGeometry = new THREE.BufferGeometry();
    arrowGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, -1.35,
      -0.92, 0, 0.34,
      -0.34, 0, 0.34,
      -0.34, 0, 1.25,
      0.34, 0, 1.25,
      0.34, 0, 0.34,
      0.92, 0, 0.34,
    ], 3));
    arrowGeometry.setIndex([0, 1, 2, 0, 2, 5, 0, 5, 6, 2, 3, 4, 2, 4, 5]);
    arrowGeometry.computeVertexNormals();
    const arrows = new THREE.InstancedMesh(
      arrowGeometry,
      new THREE.MeshStandardMaterial({ color: 0x6fd8ca, roughness: 0.8, flatShading: true, emissive: 0x1a625d, emissiveIntensity: 0.18 }),
      16,
    );
    arrows.name = 'painted directional arrows';
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3(0.88, 1, 0.88);
    for (let index = 0; index < 16; index += 1) {
      const sample = this.getSample(0.08 + index / 16);
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(sample.tangent.x, sample.tangent.z));
      matrix.compose(sample.center.clone().setY(0.052), rotation, scale);
      arrows.setMatrixAt(index, matrix);
    }
    arrows.instanceMatrix.needsUpdate = true;
    this.group.add(arrows);
  }
}
