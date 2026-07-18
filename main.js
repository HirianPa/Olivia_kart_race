import * as THREE from 'three';
import './styles.css';
import { KART_PHYSICS } from './config.js';
import { KeyboardInput } from './input/KeyboardInput.js';
import { isTouchDevice, TouchInput } from './input/TouchInput.js';
import { ItemSystem } from './items/ItemSystem.js';
import { CoinSystem } from './items/CoinSystem.js';
import { routeCoinEvents } from './items/CoinFeedback.js';
import { ProjectileSystem } from './items/ProjectileSystem.js';
import { PlayerKart } from './kart/PlayerKart.js';
import { clampDelta } from './math/arcadeMath.js';
import { KartEffects } from './effects/KartEffects.js';
import { FollowCamera } from './scene/FollowCamera.js';
import { GameScene } from './scene/GameScene.js';
import { Track } from './track/Track.js';
import { RivalKart } from './race/RivalKart.js';
import { resolveKartCollisions } from './race/KartCollisions.js';
import { RaceManager } from './race/RaceManager.js';
import { RaceDirector } from './race/RaceDirector.js';
import { HUD } from './ui/HUD.js';
import { AudioSystem } from './audio/AudioSystem.js';

const container = document.querySelector('#app');
const compatibility = document.querySelector('#compatibility');

let gameScene;
let input;
let touchInput;
let animationFrame;

function showCompatibilityError() {
  compatibility.textContent = 'No pudimos iniciar WebGL. Activa la aceleración gráfica o prueba un navegador actualizado.';
  compatibility.dataset.visible = 'true';
}

try {
  const track = new Track();
  gameScene = new GameScene(container, track);
  const player = new PlayerKart(track);
  const rivals = [
    new RivalKart(track, { t: 0.068, lane: -3, color: 0xff765f, maxSpeed: 31.5, name: 'Coralín' }),
    new RivalKart(track, { t: 0.059, lane: 3, color: 0x75c94b, maxSpeed: 30.8, name: 'Lima Lú' }),
    new RivalKart(track, { t: 0.051, lane: -3, color: 0x8b6ee8, maxSpeed: 32.2, name: 'Tiko Tinta' }),
    new RivalKart(track, { t: 0.043, lane: 3, color: 0xffbd3e, maxSpeed: 31.2, name: 'Solín' }),
  ];
  const participants = [player, ...rivals];
  const race = new RaceManager(participants, { laps: 3, countdown: 3 });
  const items = new ItemSystem(track, {
    raceDirector: new RaceDirector(),
    getRacePosition: (kart) => {
      const snapshot = race.snapshot(kart);
      return { position: snapshot.position, total: snapshot.total };
    },
  });
  const coins = new CoinSystem(track);
  player.coinSystem = coins;
  for (const rival of rivals) rival.coinSystem = coins;
  const projectiles = new ProjectileSystem(track);
  const effects = new KartEffects();
  gameScene.attachEffects(effects);
  const hud = new HUD(document);
  const audio = new AudioSystem();
  input = new KeyboardInput(window);
  const touchControls = document.querySelector('#touch-controls');
  if (touchControls && isTouchDevice(window)) {
    document.documentElement.classList.add('touch-capable');
    touchInput = new TouchInput(touchControls);
  }
  gameScene.scene.add(track.group, items.group, coins.group, projectiles.group, effects.group, player.group, ...rivals.map((rival) => rival.group));

  const followCamera = new FollowCamera(gameScene.camera, player.group);
  player.setEffectEmitter((type, position, color, shake) => {
    effects.emit(type, position, color);
    if (shake > 0) followCamera.shake(shake);
  });
  const timer = new THREE.Timer();
  timer.connect(document);
  let processedProjectileEvents = 0;
  let processedItemEvents = 0;
  let audioEnabled = false;
  let lastCountdown = null;
  let wasBoosting = false;
  let wasAirborne = false;
  const unlockAudio = () => {
    if (audioEnabled) return;
    audioEnabled = audio.unlock();
    if (!audioEnabled) return;
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });

  const activateItem = (event) => {
    if (!event) return;
    if (event.kart === player && audioEnabled) audio.play('item');
    if (event.type === 'bubble') event.kart.activateBubble();
    if (event.type === 'shell') event.kart.activateShell();
    if (event.type === 'pearl' || event.type === 'shellshot') {
      projectiles.fire(event.kart, event.type);
      effects.emit('spark', event.kart.group.position, 0xffd2f2);
    }
  };

  const animate = (timestamp) => {
    animationFrame = requestAnimationFrame(animate);
    timer.update(timestamp);
    const dt = clampDelta(timer.getDelta());
    const elapsed = timer.getElapsed();
    race.update(dt);
    const playerSnapshot = race.snapshot(player);
    if (audioEnabled && playerSnapshot.state === 'countdown' && playerSnapshot.countdown !== lastCountdown) audio.play('countdown');
    if (audioEnabled && playerSnapshot.state === 'racing' && lastCountdown !== 'GO') audio.play('turbo');
    lastCountdown = playerSnapshot.state === 'racing' ? 'GO' : playerSnapshot.countdown;
    const keyboardState = input.read();
    const touchState = touchInput?.read() ?? { throttle: 0, brake: 0, steer: 0, drift: false, useItem: false };
    const inputState = {
      throttle: Math.max(keyboardState.throttle, touchState.throttle),
      brake: Math.max(keyboardState.brake, touchState.brake),
      steer: Math.max(-1, Math.min(1, keyboardState.steer + touchState.steer)),
      drift: keyboardState.drift || touchState.drift,
      useItem: keyboardState.useItem || touchState.useItem,
    };
    const controls = race.raceActive ? inputState : { throttle: 0, brake: 0, steer: 0, drift: false, useItem: false };
    track.features.update(dt);
    items.update(dt);
    coins.update(dt);
    player.update(dt, controls, race.raceActive ? rivals : []);
    for (const rival of rivals) rival.update(dt, race.raceActive);
    if (race.raceActive) {
      resolveKartCollisions(participants);
      if (items.collectNearby(player)) {
        effects.emit('impact', player.group.position, 0x8ff7ff);
        if (audioEnabled) audio.play('item');
      }
      coins.collectNearby(player);
      if (controls.useItem) activateItem(items.use(player));
      for (const rival of rivals) {
        if (items.collectNearby(rival)) effects.emit('spark', rival.group.position, 0x8ff7ff);
        coins.collectNearby(rival);
        if (rival.itemUseTimer <= dt) {
          if (rival.tickItemDecision(dt, {
            item: items.inventoryOf(rival),
            participants,
            projectiles: projectiles.pool,
          })) activateItem(items.use(rival));
        } else {
          rival.tickItemDecision(dt);
        }
      }
      projectiles.update(dt, participants);
      while (processedProjectileEvents < projectiles.events.length) {
        const hit = projectiles.events[processedProjectileEvents++];
        effects.emit('impact', hit.target.group.position, 0xff80b5);
        if (hit.target === player) {
          followCamera.shake(0.2);
          if (audioEnabled) audio.play('hit');
        }
      }
    }
    if (processedProjectileEvents === projectiles.events.length) {
      projectiles.events.length = 0;
      processedProjectileEvents = 0;
    }
    const coinFeedback = routeCoinEvents(coins.consumeEvents(), player);
    for (const coinEvent of coinFeedback.worldEvents) {
      effects.emit(coinEvent.type === 'coin-collect' ? 'coin' : 'impact', coinEvent.kart?.group?.position ?? player.group.position, coinEvent.type === 'coin-collect' ? 0xffd766 : 0xff9a8b);
      if (coinEvent.kart === player) {
        if (coinEvent.type === 'coin-loss') followCamera.shake(0.14);
        if (audioEnabled) audio.play(coinEvent.type === 'coin-collect' ? 'collect' : 'hit');
      }
    }
    const playerCoinEvent = coinFeedback.playerEvents.at(-1) ?? null;
    while (processedItemEvents < items.events.length) {
      const itemEvent = items.events[processedItemEvents++];
      if (audioEnabled && itemEvent.kart === player && itemEvent.type === 'collect') audio.play('collect');
    }
    if (processedItemEvents === items.events.length) {
      items.events.length = 0;
      processedItemEvents = 0;
    }
    const boostActive = player.boostLevel > 0 || player.slipstreamState.active || player.padBoostTimer > 0 || player.trickBoostTimer > 0 || player.bubbleTimer > 0;
    if (audioEnabled) {
      audio.updateEngine(player.speed, boostActive);
      if (player.driftState.active) audio.play('drift');
      if (boostActive && !wasBoosting) audio.play('turbo');
      if (player.jump.airborne && !wasAirborne) audio.play('jump');
    }
    wasBoosting = boostActive;
    wasAirborne = player.jump.airborne;
    hud.update(playerSnapshot, player, items.inventoryOf(player), playerCoinEvent);
    effects.update(dt);
    followCamera.update(dt, Math.abs(player.speed) / KART_PHYSICS.maxForwardSpeed);
    gameScene.update(dt, elapsed);
    gameScene.recordFrame(dt);
    gameScene.renderer.render(gameScene.scene, gameScene.camera);
  };

  const onResize = () => gameScene.resize();
  window.addEventListener('resize', onResize);
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize', onResize);
    input.dispose();
    touchInput?.dispose();
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    audio.dispose();
    timer.dispose();
    gameScene.dispose();
  }, { once: true });

  animate();
} catch (error) {
  console.error('Brisacoral Kart could not start:', error);
  input?.dispose();
  gameScene?.dispose();
  showCompatibilityError();
}
