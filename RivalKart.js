import * as THREE from 'three';
import { createKartModel } from '../kart/createKartModel.js';
import { KartAnimator } from '../kart/KartAnimator.js';
import { JumpSystem } from '../kart/JumpSystem.js';
import { damp, moveToward } from '../math/arcadeMath.js';
import { shouldRivalUseItem } from './RivalItemDecision.js';

const BUBBLE_DURATION = 1.15;
const BUBBLE_SPEED = 6.5;
const SHELL_DURATION = 6;
const STUN_DURATION = 0.75;
const STUN_SPIN_RADIANS = Math.PI * 2;
const COIN_SPEED_BONUS = 0.22;
const PAD_SPEED = 6;
const shellGeometry = new THREE.IcosahedronGeometry(1.62, 1);
const shellMaterial = new THREE.MeshStandardMaterial({
  color: 0x96ed8a, emissive: 0x2d9b6d, emissiveIntensity: 0.42, transparent: true, opacity: 0.38, flatShading: true,
});
const bubbleGeometry = new THREE.TorusGeometry(1.44, 0.11, 6, 12);
const bubbleMaterial = new THREE.MeshStandardMaterial({ color: 0x91f7f0, emissive: 0x258da0, emissiveIntensity: 0.8, flatShading: true });

export class RivalKart {
  constructor(track, { t = 0, lane = 0, color = 0xff765f, accent = 0xffe4a2, maxSpeed = 31, name = 'Rival', accessory } = {}) {
    this.track = track;
    this.lane = lane;
    this.maxSpeed = maxSpeed;
    this.name = name;
    this.totalProgress = t;
    this.speed = 0;
    this.forwardSpeed = 0;
    this.velocity = new THREE.Vector3();
    this.coinCount = 0;
    this.kartContactCooldown = 0;
    this.coinSystem = null;
    this.padBoostTimer = 0;
    this.jump = new JumpSystem();
    this.straight = false;
    this.targetSpeed = maxSpeed;
    this.group = new THREE.Group();
    const silhouette = accessory ?? ({
      'CoralÃ­n': 'windupKey',
      'Lima LÃº': 'dorsalFin',
      'Tiko Tinta': 'fan',
      'SolÃ­n': 'pennant',
    }[name] ?? 'windupKey');
    const model = createKartModel(color, accent, silhouette);
    this.visual = model.group;
    this.kartParts = model.parts;
    this.animator = new KartAnimator(this.kartParts);
    this.visual.scale.setScalar(0.94);
    this.group.add(this.visual);
    this.bubbleTimer = 0;
    this.shellTimer = 0;
    this.stunTimer = 0;
    this.pendingHitReaction = false;
    this.itemUseTimer = 1.6 + t * 3;
    this.shellVisual = new THREE.Mesh(shellGeometry, shellMaterial);
    this.shellVisual.visible = false;
    this.shellVisual.position.y = 1.46;
    this.bubbleVisual = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    this.bubbleVisual.visible = false;
    this.bubbleVisual.rotation.x = Math.PI / 2;
    this.bubbleVisual.position.y = 0.36;
    this.group.add(this.shellVisual, this.bubbleVisual);
    this.#place();
  }

  get progress() { return ((this.totalProgress % 1) + 1) % 1; }

  getCoinSpeedBonus() {
    return Math.min(Math.max(this.coinCount, 0), 10) * COIN_SPEED_BONUS;
  }

  activateBubble() {
    this.bubbleTimer = BUBBLE_DURATION;
  }

  activateShell() {
    this.shellTimer = SHELL_DURATION;
    this.shellVisual.visible = true;
  }

  onKartCollision(normal, impulse) {
    this.speed *= 0.9;
    this.forwardSpeed = this.speed;
    this.velocity.addScaledVector(normal, impulse * 0.45);
    this.pendingHitReaction = true;
  }

  receivePearlHit() {
    if (this.shellTimer > 0) {
      this.shellTimer = 0;
      this.shellVisual.visible = false;
      return { blocked: true };
    }
    this.stunTimer = STUN_DURATION;
    this.pendingHitReaction = true;
    this.bubbleTimer = 0;
    this.speed *= 0.3;
    this.forwardSpeed = this.speed;
    this.coinSystem?.drop(this, 3);
    return { blocked: false };
  }

  tickItemDecision(dt, context = {}) {
    this.itemUseTimer -= dt;
    if (this.itemUseTimer > 0) return false;
    const shouldUse = shouldRivalUseItem({
      self: this,
      ...context,
      straight: context.straight ?? this.straight,
      targetSpeed: context.targetSpeed ?? this.targetSpeed,
    });
    if (!shouldUse) {
      this.itemUseTimer = 0.42;
      return false;
    }
    this.itemUseTimer = 2.4 + (this.totalProgress * 17 % 1) * 1.8;
    return true;
  }

  #place() {
    const sample = this.track.getSample(this.progress);
    this.group.position.copy(sample.center).addScaledVector(sample.side, this.lane).setY(0.12);
    this.group.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
  }

  update(dt, raceActive) {
    if (!raceActive) return;
    this.kartContactCooldown = Math.max(0, this.kartContactCooldown - dt);
    this.bubbleTimer = Math.max(0, this.bubbleTimer - dt);
    this.shellTimer = Math.max(0, this.shellTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.padBoostTimer = Math.max(0, this.padBoostTimer - dt);
    const sample = this.track.getSample(this.progress);
    const ahead = this.track.getSample(this.progress + 0.018);
    const curveAmount = 1 - THREE.MathUtils.clamp(sample.tangent.dot(ahead.tangent), -1, 1);
    const curveSpeed = this.maxSpeed * (1 - Math.min(curveAmount * 5.5, 0.28));
    this.straight = curveAmount < 0.012;
    this.targetSpeed = curveSpeed;
    const featureBoost = this.padBoostTimer > 0 ? PAD_SPEED : 0;
    const targetSpeed = this.stunTimer > 0 ? 0 : curveSpeed + this.getCoinSpeedBonus() + Math.max(featureBoost, this.bubbleTimer > 0 ? BUBBLE_SPEED : 0);
    this.speed = moveToward(this.speed, targetSpeed, (this.stunTimer > 0 ? 20 : 13) * dt);
    this.forwardSpeed = this.speed;
    this.totalProgress += (this.speed / this.track.curve.getLength()) * dt;
    const next = this.track.getSample(this.progress);
    const oldPosition = this.group.position.clone();
    const target = next.center.clone().addScaledVector(next.side, this.lane + Math.sin(this.totalProgress * 18) * 0.35).setY(0.12);
    this.group.position.lerp(target, 1 - Math.exp(-14 * dt));
    this.velocity.copy(this.group.position).sub(oldPosition).divideScalar(Math.max(dt, 0.0001));
    const desiredHeading = Math.atan2(next.tangent.x, next.tangent.z);
    let headingDelta = THREE.MathUtils.euclideanModulo(desiredHeading - this.group.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    if (this.stunTimer === 0) {
      this.group.rotation.y += headingDelta * (1 - Math.exp(-10 * dt));
    }
    this.visual.rotation.z = damp(this.visual.rotation.z, -headingDelta * 0.22, 8, dt);
    const features = this.track.features;
    const featureState = features?.query(this.group.position) ?? { ramp: null, pad: null };
    const trickAttempt = Boolean(featureState.ramp) && Math.floor(this.totalProgress * 13) % 3 !== 0;
    const jumpState = this.jump.update(dt, { ramp: Boolean(featureState.ramp), driftPressed: trickAttempt });
    if (featureState.pad && features.activatePad(featureState.pad)) this.padBoostTimer = 0.46;
    this.visual.rotation.y = this.stunTimer > 0 ? (1 - this.stunTimer / STUN_DURATION) * STUN_SPIN_RADIANS : 0;
    this.visual.rotation.x = damp(this.visual.rotation.x, -jumpState.pitch, 10, dt);
    this.visual.position.y = 0.04 + jumpState.height;
    this.shellVisual.visible = this.shellTimer > 0;
    this.shellVisual.rotation.y += dt * 2.8;
    this.bubbleVisual.visible = this.bubbleTimer > 0;
    this.bubbleVisual.rotation.z += dt * 7;
    this.animator.update(dt, {
      speed: this.speed,
      steer: THREE.MathUtils.clamp(headingDelta * 3, -1, 1),
      lean: this.visual.rotation.z,
      airborne: this.jump.airborne,
      landed: jumpState.landed,
      hit: this.pendingHitReaction,
    });
    this.pendingHitReaction = false;
  }
}
