import * as THREE from 'three';
import { COLORS } from '../config.js';
import { ToyBoxEnvironment } from './ToyBoxEnvironment.js';
import { QualityController } from './QualityController.js';

export class GameScene {
  constructor(container, track) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.sky, 120, 430);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 650);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.prepend(this.renderer.domElement);
    this.#addLights();
    this.#addEnvironment(track);
    this.qualityController = new QualityController({
      environment: this.environment,
      shadows: {
        setSize: (size) => this.#setShadowSize(size),
        setEnabled: (enabled) => this.#setDynamicShadows(enabled),
      },
    });
    this.resize();
  }

  #addLights() {
    this.scene.add(new THREE.HemisphereLight(0xdff9ff, 0x3f6c55, 1.8));
    this.sun = new THREE.DirectionalLight(0xfff0cf, 2.6);
    this.sun.position.set(-65, 105, 35);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -95;
    this.sun.shadow.camera.right = 95;
    this.sun.shadow.camera.top = 95;
    this.sun.shadow.camera.bottom = -95;
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 240;
    this.sun.shadow.bias = -0.0002;
    this.scene.add(this.sun);
  }

  #addEnvironment(track) {
    this.environment = new ToyBoxEnvironment(track);
    this.scene.add(this.environment.group);
  }

  update(dt, elapsed) {
    this.environment.update(dt, elapsed);
  }

  attachEffects(effects) {
    this.qualityController.setEffects(effects);
  }

  recordFrame(dt) {
    this.qualityController.update(dt);
  }

  getDebugSnapshot() {
    const snapshot = this.qualityController.getSnapshot();
    snapshot.drawCalls = this.renderer.info.render.calls;
    snapshot.triangles = this.renderer.info.render.triangles;
    return snapshot;
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  dispose() {
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose());
      else if (object.material) object.material.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  #setShadowSize(size) {
    if (this.sun.shadow.mapSize.x === size && this.sun.shadow.mapSize.y === size) return;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
  }

  #setDynamicShadows(enabled) {
    this.sun.castShadow = enabled;
    this.renderer.shadowMap.enabled = enabled;
  }
}
