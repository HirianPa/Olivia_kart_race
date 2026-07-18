const PEARL_RANGE = 30;
const PEARL_CONE_DOT = 0.52;
const DEFENCE_RANGE = 11;

function isAhead(self, candidate, range = PEARL_RANGE, coneDot = PEARL_CONE_DOT) {
  if (!candidate?.group || candidate === self) return false;
  const dx = candidate.group.position.x - self.group.position.x;
  const dz = candidate.group.position.z - self.group.position.z;
  const distanceSquared = dx * dx + dz * dz;
  if (distanceSquared < 1 || distanceSquared > range * range) return false;
  const inverseDistance = 1 / Math.sqrt(distanceSquared);
  const heading = self.group.rotation.y;
  return (Math.sin(heading) * dx + Math.cos(heading) * dz) * inverseDistance >= coneDot;
}

function isCloseBehind(self, candidate) {
  if (!candidate?.group || candidate === self) return false;
  const dx = candidate.group.position.x - self.group.position.x;
  const dz = candidate.group.position.z - self.group.position.z;
  const distanceSquared = dx * dx + dz * dz;
  if (distanceSquared < 1 || distanceSquared > DEFENCE_RANGE * DEFENCE_RANGE) return false;
  const inverseDistance = 1 / Math.sqrt(distanceSquared);
  const heading = self.group.rotation.y;
  return (Math.sin(heading) * dx + Math.cos(heading) * dz) * inverseDistance < -0.25;
}

function incomingProjectileIsClose(self, projectiles) {
  for (const projectile of projectiles ?? []) {
    if (!projectile?.active || projectile.owner === self || !projectile.position) continue;
    const dx = projectile.position.x - self.group.position.x;
    const dz = projectile.position.z - self.group.position.z;
    if (dx * dx + dz * dz <= DEFENCE_RANGE * DEFENCE_RANGE) return true;
  }
  return false;
}

/**
 * Pure, infrequent rival item choice. Call it from a paced AI think tick rather
 * than every simulation frame.
 */
export function shouldRivalUseItem({
  item,
  self,
  participants = [],
  projectiles = [],
  straight = false,
  targetSpeed = self?.maxSpeed ?? 0,
  threatened = false,
  defensive = false,
} = {}) {
  if (!item || !self?.group) return false;

  if (item === 'bubble') return straight || (self.speed ?? 0) < targetSpeed * 0.83;
  if (item === 'pearl' || item === 'shellshot') return participants.some((candidate) => isAhead(self, candidate));
  if (item === 'shell') {
    return threatened || defensive || incomingProjectileIsClose(self, projectiles) || participants.some((candidate) => isCloseBehind(self, candidate));
  }
  return false;
}
