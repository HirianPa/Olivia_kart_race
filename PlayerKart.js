import * as THREE from 'three';
import { KART_PHYSICS } from '../config.js';
import { clampDelta, damp, moveToward } from '../math/arcadeMath.js';
import { createKartModel } from './createKartModel.js';
import { KartAnimator } from './KartAnimator.js';
import { AntiStuckSystem } from './AntiStuckSystem.js';
import { DriftSystem } from './DriftSystem.js';
import { SlipstreamSystem } from './SlipstreamSystem.js';
import { JumpSystem } from './JumpSystem.js';

const BUBBLE_DURATION = 1.15;
const BUBBLE_SPEED = 7;
const SHELL_DURATION = 6;
const STUN_DURATION = 0.75;
const STUN_SPIN_RADIANS = Math.PI * 2;
const COIN_SPEED_BONUS = 0.22;
const shellGeometry = new THREE.IcosahedronGeometry(1.72, 1);
const shellMaterial = new THREE.MeshStandardMaterial({
  color: 0x96ed8a, emissive: 0x2d9b6d, emissiveIntensity: 0.42, transparent: true, opacity: 0.38, flatShading: true,
});
const bubbleGeometry = new THREE.TorusGeometry(1.52, 0.12, 6, 12);
const bubbleMaterial = new THREE.MeshStandardMaterial({ color: 0x91f7f0, emissive: 0x258da0, emissiveIntensity: 0.8, flatShading: true });

export class PlayerKart {
  constructor(track) {
    this.name = 'Marea';
    this.track = track;
    this.group = new THREE.Group();
    const model = createKartModel();
    this.visual = model.group;
    this.kartParts = model.parts;
    this.animator = new KartAnimator(this.kartParts);
    this.group.add(this.visual);
    const spawn = track.getSample(0.035);
    this.group.position.copy(spawn.center);
    this.group.position.y = 0.12;
    this.heading = Math.atan2(spawn.tangent.x, spawn.tangent.z);
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.velocity = new THREE.Vector3();
    this.antiStuck = new AntiStuckSystem();
    this.drift = new DriftSystem();
    this.slipstream = new SlipstreamSystem();
    this.jump = new JumpSystem();
    this.boostTimer = 0;
    this.boostLevel = 0;
    this.slipstreamBoostTimer = 0;
    this.padBoostTimer = 0;
    this.trickBoostTimer = 0;
    this.coinCount = 0;
    this.coinSystem = null;
    this.bubbleTimer = 0;
    this.shellTimer = 0;
    this.stunTimer = 0;
    this.pendingHitReaction = false;
    this.effectEmitter = null;
    this.effectTimer = 0;
    this.shellVisual = new THREE.Mesh(shellGeometry, shellMaterial);
    this.shellVisual.visible = false;
    this.shellVisual.position.y = 1.55;
    this.bubbleVisual = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    this.bubbleVisual.visible = false;
    this.bubbleVisual.rotation.x = Math.PI / 2;
    this.bubbleVisual.position.y = 0.38;
    this.group.add(this.shellVisual, this.bubbleVisual);
    this.lastCollided = false;
    this.kartContactCooldown = 0;
    this.group.rotation.y = this.heading;
  }

  get speed() {
    return this.forwardSpeed;
  }

  get driftState() {
    return { active: this.drift.active, level: this.drift.level, charge: this.drift.charge, boostLevel: this.boostLevel };
  }

  get slipstreamState() {
    return { charge: this.slipstream.charge, active: this.slipstreamBoostTimer > 0 };
  }

  getItemBoostSpeed() {
    return this.bubbleTimer > 0 ? BUBBLE_SPEED : 0;
  }

  getCoinSpeedBonus() {
    return Math.min(Math.max(this.coinCount, 0), 10) * COIN_SPEED_BONUS;
  }

  activateBubble() {
    this.bubbleTimer = BUBBLE_DURATION;
    this.emitEffect('streak', 0x9cfaff, 0.12);
  }

  activateShell() {
    this.shellTimer = SHELL_DURATION;
    this.shellVisual.visible = true;
  }

  setEffectEmitter(emitter) {
    this.effectEmitter = typeof emitter === 'function' ? emitter : null;
  }

  emitEffect(type, color, shake = 0) {
    this.effectEmitter?.(type, this.group.position, color, shake);
  }

  onKartCollision(normal, impulse) {
    this.forwardSpeed *= 0.9;
    this.lateralSpeed += normal.x * impulse * 0.45;
    this.pendingHitReaction = true;
    this.emitEffect('impact', 0xffa36e, Math.min(0.16, impulse * 0.035));
  }

  receivePearlHit() {
    if (this.shellTimer > 0) {
      this.shellTimer = 0;
      this.shellVisual.visible = false;
      return { blocked: true };
    }
    this.stunTimer = STUN_DURATION;
    this.pendingHitReaction = true;
    this.boostTimer = 0;
    this.boostLevel = 0;
    this.bubbleTimer = 0;
    this.forwardSpeed *= 0.3;
    this.drift.active = false;
    this.coinSystem?.drop(this, 3);
    this.emitEffect('impact', 0xff80b5, 0.28);
    return { blocked: false };
  }

  get progress() {
    return this.track.getClosestInfo(this.group.position).t;
  }

  update(rawDt, controls, slipstreamTargets = []) {
    const dt = clampDelta(rawDt);
    this.kartContactCooldown = Math.max(0, this.kartContactCooldown - dt);
    const { throttle = 0, brake = 0, steer = 0, drift = false } = controls;
    const hadCollision = this.lastCollided;
    const driftState = this.drift.update(dt, {
      held: drift,
      steer,
      speed: this.forwardSpeed,
      slip: this.lateralSpeed,
      collided: this.lastCollided,
    });
    if (driftState.releasedBoost > 0) {
      this.boostLevel = driftState.releasedBoost;
      this.boostTimer = driftState.releasedBoost === 2 ? 1.25 : 0.72;
      this.emitEffect('streak', driftState.releasedBoost === 2 ? 0xff9d44 : 0x5bc8ff, driftState.releasedBoost === 2 ? 0.2 : 0.12);
    }
    this.lastCollided = false;
    this.boostTimer = Math.max(0, this.boostTimer - dt);
    this.slipstreamBoostTimer = Math.max(0, this.slipstreamBoostTimer - dt);
    this.padBoostTimer = Math.max(0, this.padBoostTimer - dt);
    this.trickBoostTimer = Math.max(0, this.trickBoostTimer - dt);
    this.bubbleTimer = Math.max(0, this.bubbleTimer - dt);
    this.shellTimer = Math.max(0, this.shellTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    if (this.boostTimer === 0) this.boostLevel = 0;
    const slipstream = this.slipstream.update(dt, { player: this, targets: slipstreamTargets });
    if (slipstream.boost) {
      this.slipstreamBoostTimer = 0.8;
      this.emitEffect('streak', 0xb9fff1, 0.12);
    }
    const boostSpeed = this.boostLevel === 2 ? 13 : this.boostLevel === 1 ? 8 : 0;
    const slipstreamSpeed = this.slipstreamBoostTimer > 0 ? 5.5 : 0;
    const padSpeed = this.padBoostTimer > 0 ? 6 : 0;
    const trickSpeed = this.trickBoostTimer > 0 ? 7.5 : 0;
    const activeBoostSpeed = Math.max(boostSpeed, slipstreamSpeed, padSpeed, trickSpeed, this.getItemBoostSpeed());
    const coinSpeed = this.getCoinSpeedBonus();
    let targetSpeed = 0;
    let rate = KART_PHYSICS.coastDrag;
    const stunned = this.stunTimer > 0;
    if (stunned) {
      rate = KART_PHYSICS.braking * 0.65;
    } else if (throttle > 0) {
      targetSpeed = KART_PHYSICS.maxForwardSpeed + coinSpeed + activeBoostSpeed;
      rate = KART_PHYSICS.acceleration + activeBoostSpeed * 2.2;
    } else if (brake > 0) {
      targetSpeed = -KART_PHYSICS.maxReverseSpeed;
      rate = this.forwardSpeed > 0 ? KART_PHYSICS.braking : KART_PHYSICS.acceleration * 0.7;
    }
    this.forwardSpeed = moveToward(this.forwardSpeed, targetSpeed, rate * dt);

    const speedRatio = Math.min(Math.abs(this.forwardSpeed) / 16, 1);
    const steerStrength = 0.25 + 0.75 * speedRatio;
    const direction = this.forwardSpeed < -0.2 ? -1 : 1;
    const driftSteer = driftState.active ? 1.28 : 1;
    if (!stunned) {
      this.heading += steer * KART_PHYSICS.steerRate * steerStrength * driftSteer * direction * dt;
    }

    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const grip = driftState.active ? 2.25 : KART_PHYSICS.lateralGrip;
    this.lateralSpeed = damp(this.lateralSpeed, 0, grip, dt);
    if (driftState.active) this.lateralSpeed -= steer * 8.5 * dt * speedRatio;

    const beforeInfo = this.track.getClosestInfo(this.group.position);
    if (!beforeInfo.onRoad && brake <= 0) {
      this.forwardSpeed = moveToward(this.forwardSpeed, 0, KART_PHYSICS.offroadDrag * dt);
    }

    this.velocity.copy(forward).multiplyScalar(this.forwardSpeed).addScaledVector(right, this.lateralSpeed);
    const nextPosition = this.group.position.clone().addScaledVector(this.velocity, dt);
    const constrained = this.track.constrain(nextPosition, this.velocity);
    const recovery = this.antiStuck.update(dt, {
      collided: constrained.collided,
      speed: this.forwardSpeed,
      outwardSpeed: constrained.outwardSpeed,
      steer,
      brake,
      sideSign: Math.sign(constrained.info.signedDistance),
      tangent: constrained.info.tangent,
      side: constrained.info.side,
    });
    this.lastCollided = constrained.collided;
    if (constrained.collided) {
      if (!hadCollision) this.emitEffect('impact', 0xffd29a, 0.22);
      constrained.position.addScaledVector(constrained.info.side, -Math.sign(constrained.info.signedDistance) * recovery.inset);
      constrained.velocity.add(recovery.velocityBias);
      if (recovery.headingBlend > 0) {
        const targetTangent = constrained.info.tangent.clone();
        if (forward.dot(targetTangent) < 0) targetTangent.negate();
        const targetHeading = Math.atan2(targetTangent.x, targetTangent.z);
        const headingDelta = Math.atan2(Math.sin(targetHeading - this.heading), Math.cos(targetHeading - this.heading));
        this.heading += headingDelta * recovery.headingBlend;
      }
    }
    this.group.position.copy(constrained.position);
    this.velocity.copy(constrained.velocity);
    const resolvedForward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const resolvedRight = new THREE.Vector3(resolvedForward.z, 0, -resolvedForward.x);
    this.forwardSpeed = THREE.MathUtils.clamp(this.velocity.dot(resolvedForward), -KART_PHYSICS.maxReverseSpeed, KART_PHYSICS.maxForwardSpeed + coinSpeed + activeBoostSpeed);
    this.lateralSpeed = this.velocity.dot(resolvedRight);

    const features = this.track.features;
    const featureState = features?.query(this.group.position) ?? { ramp: null, pad: null };
    const jumpState = this.jump.update(dt, { ramp: Boolean(featureState.ramp), driftPressed: drift });
    if (featureState.pad && features.activatePad(featureState.pad)) {
      this.padBoostTimer = 0.46;
      this.emitEffect('streak', 0x9cfaff, 0.12);
    }
    if (jumpState.trickBoost) {
      this.trickBoostTimer = 0.52;
      this.emitEffect('spark', 0xffd45e, 0.16);
    }
    if (jumpState.landed) this.emitEffect('dust', 0xffe0b3, 0.2);

    this.effectTimer = Math.max(0, this.effectTimer - dt);
    if (this.effectTimer === 0 && (driftState.active || speedRatio > 0.86 || this.slipstreamBoostTimer > 0)) {
      if (driftState.active) {
        this.emitEffect('smoke', 0xe8f6ef);
        this.emitEffect('dust', 0xffd8a8);
        if (driftState.level > 0) this.emitEffect('spark', driftState.level === 2 ? 0xff9d44 : 0x5bc8ff);
      } else this.emitEffect('streak', this.slipstreamBoostTimer > 0 ? 0xb9fff1 : 0xd8fbff);
      this.effectTimer = driftState.active ? 0.09 : 0.13;
    }

    this.group.rotation.y = this.heading;
    this.visual.rotation.z = damp(this.visual.rotation.z, -steer * speedRatio * (driftState.active ? 0.14 : 0.08), 8, dt);
    this.visual.rotation.x = damp(this.visual.rotation.x, -jumpState.pitch, 10, dt);
    this.visual.rotation.y = stunned ? (1 - this.stunTimer / STUN_DURATION) * STUN_SPIN_RADIANS : 0;
    this.visual.position.y = 0.04 + jumpState.height + Math.sin(performance.now() * 0.01) * Math.min(speedRatio, 0.8) * 0.025;
    this.shellVisual.visible = this.shellTimer > 0;
    this.shellVisual.rotation.y += dt * 2.8;
    this.bubbleVisual.visible = this.bubbleTimer > 0;
    this.bubbleVisual.rotation.z += dt * 7;
    this.animator.update(dt, {
      speed: this.forwardSpeed,
      steer,
      lean: this.visual.rotation.z,
      airborne: this.jump.airborne,
      landed: jumpState.landed,
      hit: this.pendingHitReaction,
    });
    this.pendingHitReaction = false;
  }
}
