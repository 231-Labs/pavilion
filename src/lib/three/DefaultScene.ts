import * as THREE from 'three';

export interface DefaultSceneConfig {
  backgroundColor?: number;
  enableGrid?: boolean;
  enableParticles?: boolean;
  enableHolographicElements?: boolean;
  enableSpotlights?: boolean;
}

export class DefaultScene {
  private scene: THREE.Scene;
  private gridHelper?: THREE.GridHelper;
  private particleSystem?: THREE.Points;
  private holographicElements: THREE.Group[] = [];

  constructor(scene: THREE.Scene, config: DefaultSceneConfig = {}) {
    this.scene = scene;
    this.initializeBackground(config);
    this.createFloor();
    this.createWalls();
    this.createSpaceGrid(config.enableGrid);
    this.createParticleField(config.enableParticles);
    this.createHolographicElements(config.enableHolographicElements);
    if (config.enableSpotlights !== false) {
      this.createSpotlights();
    }
  }

  private initializeBackground(config: DefaultSceneConfig) {
    // 背景改成深灰色
    this.scene.background = new THREE.Color(config.backgroundColor || 0x1a1a1a);

    // 冷灰霧效果
    const fog = new THREE.Fog(0x1a1a1a, 30, 100);
    this.scene.fog = fog;
  }

  private createFloor() {
    // 淡灰色線條地板
    const floorGeometry = new THREE.PlaneGeometry(20, 20, 10, 10);
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.1,
      wireframe: true,
      side: THREE.DoubleSide
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    this.scene.add(floor);

    // 地板光暈（灰白）
    const floorGlowGeometry = new THREE.PlaneGeometry(21, 21);
    const floorGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide
    });

    const floorGlow = new THREE.Mesh(floorGlowGeometry, floorGlowMaterial);
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.y = -0.11;
    this.scene.add(floorGlow);
  }

  private createWalls() {
    // 背牆：深灰色，半透明
    const wallGeometry = new THREE.PlaneGeometry(20, 10, 4, 4);
    const wallMaterial = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
      side: THREE.DoubleSide
    });

    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 5, -10);
    this.scene.add(backWall);
  }

  private createSpaceGrid(enableGrid = true) {
    if (!enableGrid) return;

    // 冷灰藍格線
    const gridSize = 20;
    const gridDivisions = 6;

    const gridHelperXY = new THREE.GridHelper(gridSize, gridDivisions, 0xcccccc, 0x222222);
    gridHelperXY.position.y = 0;
    (gridHelperXY.material as THREE.Material).transparent = true;
    (gridHelperXY.material as THREE.Material).opacity = 0.15;
    this.scene.add(gridHelperXY);

    this.gridHelper = gridHelperXY;
  }

  private createParticleField(enableParticles = true) {
    if (!enableParticles) return;

    const particleCount = 100; // 少一點，乾淨感
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

      // 幾乎白色
      colors[i * 3] = 0.8 + Math.random() * 0.2; // R
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2; // G
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // B
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.15, // 小一點
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particleSystem);
  }

  private createSpotlights() {
    // 主白色聚光燈
    const mainSpotlight = new THREE.SpotLight(0xffffff, 2.5);
    mainSpotlight.position.set(0, 12, 8);
    mainSpotlight.target.position.set(0, 0, 0);
    mainSpotlight.angle = Math.PI / 5;
    mainSpotlight.penumbra = 0.2;
    mainSpotlight.decay = 1.2;
    mainSpotlight.distance = 30;
    mainSpotlight.castShadow = true;

    this.scene.add(mainSpotlight);
    this.scene.add(mainSpotlight.target);

    // 左冷藍燈
    const sideSpotlight1 = new THREE.SpotLight(0xaaccff, 1.5);
    sideSpotlight1.position.set(-10, 8, 6);
    sideSpotlight1.target.position.set(-4, 0, 0);
    sideSpotlight1.angle = Math.PI / 6;
    sideSpotlight1.penumbra = 0.3;
    sideSpotlight1.decay = 1.3;
    sideSpotlight1.distance = 20;

    this.scene.add(sideSpotlight1);
    this.scene.add(sideSpotlight1.target);

    // 右冷藍燈
    const sideSpotlight2 = new THREE.SpotLight(0x99ccff, 1.5);
    sideSpotlight2.position.set(10, 8, 6);
    sideSpotlight2.target.position.set(4, 0, 0);
    sideSpotlight2.angle = Math.PI / 6;
    sideSpotlight2.penumbra = 0.3;
    sideSpotlight2.decay = 1.3;
    sideSpotlight2.distance = 20;

    this.scene.add(sideSpotlight2);
    this.scene.add(sideSpotlight2.target);
  }

  private createHolographicElements(enableHolographicElements = true) {
    if (!enableHolographicElements) return;
    this.createHolographicRings();
    this.createTechLines();
  }

  private createHolographicRings() {
    const ringGeometry = new THREE.RingGeometry(4, 4.2, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1;

    const ringGroup = new THREE.Group();
    ringGroup.add(ring);
    this.scene.add(ringGroup);
    this.holographicElements.push(ringGroup);
  }

  private createTechLines() {
    const lines: THREE.Group[] = [];
    const arcCount = 3;
    const radius = 8;

    for (let i = 0; i < arcCount; i++) {
      const points = [];
      const segments = 12;
      const startAngle = (i / arcCount) * Math.PI * 2;
      const arcAngle = Math.PI * 0.7;

      for (let j = 0; j <= segments; j++) {
        const angle = startAngle + (arcAngle * j / segments);
        const x = Math.cos(angle) * radius * 0.8;
        const z = Math.sin(angle) * radius;
        const y = 2 + Math.abs(Math.sin(angle * 2));
        points.push(new THREE.Vector3(x, y, z));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.2
      });

      const line = new THREE.Line(geometry, material);
      const lineGroup = new THREE.Group();
      lineGroup.add(line);
      this.scene.add(lineGroup);
      lines.push(lineGroup);
    }

    this.holographicElements.push(...lines);
  }

  update(deltaTime: number) {
    if (this.particleSystem) {
      this.particleSystem.rotation.y += deltaTime * 0.01;
    }

    this.holographicElements.forEach((element, index) => {
      element.rotation.y += deltaTime * 0.005 * (index + 1);
    });

    if (this.gridHelper && this.gridHelper.material) {
      const flicker = Math.sin(Date.now() * 0.002) * 0.05 + 0.1;
      (this.gridHelper.material as THREE.Material).opacity = Math.max(0.05, flicker);
    }
  }

  dispose() {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      if (Array.isArray(this.particleSystem.material)) {
        this.particleSystem.material.forEach(material => material.dispose());
      } else {
        this.particleSystem.material.dispose();
      }
    }

    this.holographicElements.forEach(element => {
      this.scene.remove(element);
      element.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
  }
}
