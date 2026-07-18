import * as THREE from 'three';

const KART_DIAMETER = 2.9;

export function resolveKartCollisions(karts) {
  for (let i = 0; i < karts.length; i += 1) {
    for (let j = i + 1; j < karts.length; j += 1) {
      const a = karts[i];
      const b = karts[j];
      const delta = b.group.position.clone().sub(a.group.position).setY(0);
      let distance = delta.length();
      if (distance >= KART_DIAMETER) continue;
      if (distance < 0.001) {
        delta.set(1, 0, 0);
        distance = 1;
      } else delta.divideScalar(distance);
      const correction = (KART_DIAMETER - distance + 0.002) * 0.5;
      a.group.position.addScaledVector(delta, -correction);
      b.group.position.addScaledVector(delta, correction);
      a.velocity ??= new THREE.Vector3();
      b.velocity ??= new THREE.Vector3();
      const impulse = Math.min(3.5, Math.abs((a.forwardSpeed ?? 0) - (b.forwardSpeed ?? 0)) * 0.12 + 1.2);
      a.velocity.addScaledVector(delta, -impulse);
      b.velocity.addScaledVector(delta, impulse);
      if ('forwardSpeed' in a) a.forwardSpeed *= 0.96;
      if ('forwardSpeed' in b) b.forwardSpeed *= 0.96;
      const canReact = (a.kartContactCooldown ?? 0) <= 0 && (b.kartContactCooldown ?? 0) <= 0;
      if (canReact) {
        a.onKartCollision?.(delta.clone().negate(), impulse);
        b.onKartCollision?.(delta, impulse);
        if ('kartContactCooldown' in a) a.kartContactCooldown = 0.14;
        if ('kartContactCooldown' in b) b.kartContactCooldown = 0.14;
      }
    }
  }
}
