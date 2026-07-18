import * as THREE from 'three';
import { COLORS } from '../config.js';

const paintMaterials = new Map();
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x14303b, roughness: 0.86, flatShading: true });
const creamMaterial = new THREE.MeshStandardMaterial({ color: 0xfff0bb, roughness: 0.7, flatShading: true });
const visorMaterial = new THREE.MeshStandardMaterial({ color: 0x174c62, roughness: 0.3, metalness: 0.08, flatShading: true });
const tireGeometry = new THREE.CylinderGeometry(0.54, 0.6, 0.42, 12);
const hubGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.45, 10);
const bodyGeometry = new THREE.SphereGeometry(1, 14, 9);
const capsuleGeometry = new THREE.CapsuleGeometry(0.42, 0.55, 4, 10);
const headGeometry = new THREE.IcosahedronGeometry(0.7, 2);
const shadowGeometry = new THREE.CircleGeometry(1.76, 20);
const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x15333b, transparent: true, opacity: 0.22, depthWrite: false });
const DRIVER_STYLES = {
  windupKey: { skin: 0xffc38b, helmet: 0xfff0bb, visor: 0x174c62 },
  dorsalFin: { skin: 0x9bd7ff, helmet: 0x78d2c1, visor: 0x143e55 },
  fan: { skin: 0xff9eaa, helmet: 0xffc85c, visor: 0x5e305b },
  pennant: { skin: 0xb8f08b, helmet: 0xff806c, visor: 0x254e47 },
  crest: { skin: 0xffd887, helmet: 0xfff0bb, visor: 0x174c62 },
};

function material(color) {
  if (!paintMaterials.has(color)) {
    paintMaterials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.72, flatShading: true }));
  }
  return paintMaterials.get(color);
}

function mesh(geometry, color, castShadow = true) {
  const object = new THREE.Mesh(geometry, typeof color === 'number' ? material(color) : color);
  object.castShadow = castShadow;
  object.receiveShadow = true;
  return object;
}

function addWheel(suspension, wheels, x, z, steering = null, accentColor) {
  const pivot = new THREE.Group();
  pivot.position.set(x, 0.55, z);
  const wheel = mesh(tireGeometry, darkMaterial);
  wheel.rotation.z = Math.PI / 2;
  const hub = mesh(hubGeometry, accentColor, false);
  hub.rotation.z = Math.PI / 2;
  pivot.add(wheel, hub);
  (steering ?? suspension).add(pivot);
  wheels.push(pivot);
}

function addAccessory(kart, type, accentColor) {
  const accessory = new THREE.Group();
  accessory.name = `${type} silhouette accessory`;
  const cream = 0xfff0bb;
  if (type === 'windupKey') {
    for (const x of [-0.28, 0.28]) {
      const loop = mesh(new THREE.TorusGeometry(0.23, 0.07, 5, 8), accentColor, false);
      loop.position.set(x, 1.28, -1.88);
      loop.rotation.y = Math.PI / 2;
      accessory.add(loop);
    }
    const stem = mesh(new THREE.BoxGeometry(0.18, 0.18, 0.5), accentColor, false);
    stem.position.set(0, 1.28, -1.63);
    accessory.add(stem);
  } else if (type === 'dorsalFin') {
    const fin = mesh(new THREE.ConeGeometry(0.48, 1.25, 5), accentColor, false);
    fin.position.set(0, 1.9, -1.35);
    fin.rotation.x = -0.25;
    accessory.add(fin);
  } else if (type === 'fan') {
    const hub = mesh(new THREE.SphereGeometry(0.18, 8, 6), cream, false);
    hub.position.set(0, 1.22, -1.98);
    accessory.add(hub);
    for (let index = 0; index < 4; index += 1) {
      const blade = mesh(new THREE.CapsuleGeometry(0.08, 0.36, 3, 6), accentColor, false);
      blade.position.set(0, 1.22, -1.98);
      blade.rotation.z = index * Math.PI / 2 + 0.45;
      accessory.add(blade);
    }
  } else if (type === 'pennant') {
    const mast = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), cream, false);
    mast.position.set(-0.62, 2.18, -1.32);
    const flag = mesh(new THREE.ConeGeometry(0.34, 0.72, 3), accentColor, false);
    flag.position.set(-0.28, 2.67, -1.32);
    flag.rotation.z = -Math.PI / 2;
    accessory.add(mast, flag);
  } else {
    const crest = mesh(new THREE.ConeGeometry(0.25, 0.7, 5), accentColor, false);
    crest.position.set(0, 3.32, -0.28);
    accessory.add(crest);
  }
  kart.add(accessory);
}

export function createKartModel(bodyColor = COLORS.water, accentColor = COLORS.coral, accessory = 'crest') {
  const kart = new THREE.Group();
  kart.name = 'Marea, puffer-pilot kart';
  const suspension = new THREE.Group();
  suspension.name = 'suspension rig';
  kart.add(suspension);

  const chassis = mesh(new THREE.BoxGeometry(2.48, 0.32, 3.58), darkMaterial);
  chassis.position.y = 0.62;
  suspension.add(chassis);

  const body = mesh(bodyGeometry, bodyColor);
  body.scale.set(1.12, 0.58, 1.48);
  body.position.set(0, 1.03, 0.08);
  suspension.add(body);

  const nose = mesh(bodyGeometry, bodyColor);
  nose.scale.set(0.98, 0.46, 0.9);
  nose.position.set(0, 0.88, 1.48);
  suspension.add(nose);

  const bumper = mesh(new THREE.TorusGeometry(1.18, 0.13, 6, 14, Math.PI), accentColor);
  bumper.rotation.x = Math.PI / 2;
  bumper.position.set(0, 0.67, 1.78);
  suspension.add(bumper);

  const steering = new THREE.Group();
  steering.name = 'front steering axle';
  suspension.add(steering);
  const wheels = [];
  for (const x of [-1.32, 1.32]) {
    addWheel(suspension, wheels, x, -1.08, null, accentColor);
    addWheel(suspension, wheels, x, 1.17, steering, accentColor);
  }

  const seat = mesh(new THREE.SphereGeometry(0.78, 10, 7), accentColor);
  seat.scale.set(1, 1.2, 0.42);
  seat.position.set(0, 1.45, -0.82);
  seat.rotation.x = -0.12;
  suspension.add(seat);

  const driver = new THREE.Group();
  driver.name = 'driver pose rig';
  driver.position.set(0, 0, 0);
  suspension.add(driver);
  const driverStyle = DRIVER_STYLES[accessory] ?? DRIVER_STYLES.crest;
  const torso = mesh(capsuleGeometry, driverStyle.skin);
  torso.position.set(0, 1.78, -0.26);
  driver.add(torso);

  const helmet = mesh(headGeometry, driverStyle.helmet);
  helmet.scale.set(1.06, 0.92, 1.03);
  helmet.position.set(0, 2.62, -0.2);
  driver.add(helmet);

  const visor = mesh(new THREE.SphereGeometry(0.48, 10, 6, 0, Math.PI), driverStyle.visor, false);
  visor.scale.set(1.15, 0.58, 0.38);
  visor.rotation.y = Math.PI;
  visor.position.set(0, 2.65, 0.49);
  driver.add(visor);

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  for (const [arm, side] of [[leftArm, -1], [rightArm, 1]]) {
    arm.position.set(side * 0.46, 1.93, 0.03);
    const forearm = mesh(new THREE.CapsuleGeometry(0.11, 0.46, 3, 6), creamMaterial, false);
    forearm.rotation.x = Math.PI / 2;
    forearm.position.z = 0.27;
    arm.add(forearm);
    driver.add(arm);
  }
  driver.userData.head = helmet;
  driver.userData.leftArm = leftArm;
  driver.userData.rightArm = rightArm;

  addAccessory(kart, accessory, accentColor);
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.08;
  shadow.scale.set(1, 1.35, 1);
  kart.add(shadow);
  return { group: kart, parts: { wheels, steering, driver, suspension } };
}
