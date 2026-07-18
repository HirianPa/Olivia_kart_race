import * as THREE from 'three';

const DEFAULT_POOL_SIZE = 5;
const DEFAULT_SPEED = 37;
const DEFAULT_LIFETIME = 2.8;
const HIT_RADIUS = 1.85;

const pearlGeometry = new THREE.IcosahedronGeometry(0.46, 1);
const pearlMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd2f2,
  emissive: 0x4aafd2,
  emissiveIntensity: 0.72,
  roughness: 0.26,
  flatShading: true,
});
const shellGeometry = new THREE.IcosahedronGeometry(0.58, 1);
const shellShotMaterial = new THREE.MeshStandardMaterial({
  color: 0x66d66f,
  emissive: 0x1e7a43,
  emissiveIntensity: 0.65,
  roughness: 0.3,
  flatShading: true,
});

function nearestTangent(track, position, heading) {
  const tangent = track?.getClosestInfo?.(position)?.tangent;
  const direction = tangent ? tangent.clone().setY(0).normalize() : new THREE.Vector3(0, 0, 1);
  const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  if (direction.dot(forward) < 0) direction.negate();
  return direction;
}

export class ProjectileSystem {
  constructor(track, { poolSize = DEFAULT_POOL_SIZE, speed = DEFAULT_SPEED, lifetime = DEFAULT_LIFETIME, visuals = true } = {}) {
    this.track = track;
    this.speed = speed;
    this.lifetime = lifetime;
    this.group = new THREE.Group();
    this.group.name = 'Toy-Box pearl projectiles';
    this.events = [];
    this.segment = new THREE.Vector3();
    this.toTarget = new THREE.Vector3();
    this.closest = new THREE.Vector3();
    this.pool = Array.from({ length: poolSize }, () => {
      const mesh = visuals ? new THREE.Mesh(pearlGeometry, pearlMaterial) : null;
      if (mesh) {
        mesh.visible = false;
        mesh.castShadow = true;
        this.group.add(mesh);
      }
      return {
        active: false,
        owner: null,
        position: new THREE.Vector3(),
        previous: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        age: 0,
        type: 'pearl',
        mesh,
      };
    });
  }

  get activeCount() {
    return this.pool.reduce((count, projectile) => count + Number(projectile.active), 0);
  }

  fire(owner, type = 'pearl') {
    if (!owner?.group || this.pool.some((projectile) => projectile.active && projectile.owner === owner)) return null;
    const projectile = this.pool.find((entry) => !entry.active);
    if (!projectile) return null;
    projectile.active = true;
    projectile.owner = owner;
    projectile.type = type === 'shellshot' ? 'shellshot' : 'pearl';
    projectile.age = 0;
    projectile.direction.copy(nearestTangent(this.track, owner.group.position, owner.group.rotation.y));
    projectile.position.copy(owner.group.position).addScaledVector(projectile.direction, 1.7);
    projectile.position.y += 0.85;
    projectile.previous.copy(projectile.position);
    if (projectile.mesh) {
      if (projectile.type === 'shellshot') {
        projectile.mesh.geometry = shellGeometry;
        projectile.mesh.material = shellShotMaterial;
      } else {
        projectile.mesh.geometry = pearlGeometry;
        projectile.mesh.material = pearlMaterial;
      }
      projectile.mesh.visible = true;
      projectile.mesh.position.copy(projectile.position);
    }
    return projectile;
  }

  update(dt, karts = []) {
    const safeDt = Math.max(0, dt);
    for (const projectile of this.pool) {
      if (!projectile.active) continue;
      projectile.age += safeDt;
      if (projectile.age >= this.lifetime) {
        this.#deactivate(projectile);
        continue;
      }
      projectile.previous.copy(projectile.position);
      projectile.position.addScaledVector(projectile.direction, this.speed * safeDt);
      for (const target of karts) {
        if (!target?.group || target === projectile.owner || !this.#intersects(projectile, target.group.position)) continue;
        target.receivePearlHit?.(projectile.owner);
        this.events.push({ target, owner: projectile.owner });
        this.#deactivate(projectile);
        break;
      }
      if (projectile.active && projectile.mesh) {
        projectile.mesh.position.copy(projectile.position);
        projectile.mesh.rotation.y += safeDt * 10;
      }
    }
  }

  #intersects(projectile, targetPosition) {
    this.segment.copy(projectile.position).sub(projectile.previous);
    const segmentLengthSq = this.segment.lengthSq();
    this.toTarget.copy(targetPosition).sub(projectile.previous);
    const ratio = segmentLengthSq > 0 ? THREE.MathUtils.clamp(this.toTarget.dot(this.segment) / segmentLengthSq, 0, 1) : 0;
    this.closest.copy(projectile.previous).addScaledVector(this.segment, ratio);
    return this.closest.distanceToSquared(targetPosition) <= HIT_RADIUS * HIT_RADIUS;
  }

  #deactivate(projectile) {
    projectile.active = false;
    projectile.owner = null;
    if (projectile.mesh) projectile.mesh.visible = false;
  }
}
