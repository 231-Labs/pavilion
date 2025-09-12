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
    // Create gradient background - from deep blue to purple-black cosmic tones
    this.scene.background = new THREE.Color(config.backgroundColor || 0x0a0a0f);

    // Add cosmic background fog effect
    const fog = new THREE.Fog(0x0a0a0f, 10, 100);
    this.scene.fog = fog;
  }

  private createFloor() {
    // Create transparent grid floor, reduce subdivision for better performance
    const floorGeometry = new THREE.PlaneGeometry(40, 40, 20, 20); // Reduced from 50x50x50x50 to 40x40x20x20
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.4, // Slightly increase visibility to compensate for reduced subdivision
      wireframe: true,
      side: THREE.DoubleSide
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    floor.receiveShadow = false;
    this.scene.add(floor);

    // Simplified floor glow effect
    const floorGlowGeometry = new THREE.PlaneGeometry(42, 42); // Reduced from 52x52 to 42x42
    const floorGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.03, // Lower opacity
      side: THREE.DoubleSide
    });

    const floorGlow = new THREE.Mesh(floorGlowGeometry, floorGlowMaterial);
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.y = -0.11;
    this.scene.add(floorGlow);
  }

  private createWalls() {
    // Create transparent walls - keep only back wall as space boundary, reduce subdivision
    const wallGeometry = new THREE.PlaneGeometry(40, 15, 5, 5); // Reduced from 50x20x10x10 to 40x15x5x5
    const wallMaterial = new THREE.MeshBasicMaterial({
      color: 0x16213e,
      transparent: true,
      opacity: 0.25, // Slightly increase visibility
      wireframe: true,
      side: THREE.DoubleSide
    });

    // Back wall
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 7.5, -20); // Adjust position to match new dimensions
    this.scene.add(backWall);
  }

  private createSpaceGrid(enableGrid = true) {
    if (!enableGrid) return;

    // Create 3D space grid, reduce subdivision for better performance
    const gridSize = 40; // Reduced from 50 to 40
    const gridDivisions = 8; // Reduced from 20 to 8

    // XY plane grid (horizontal)
    const gridHelperXY = new THREE.GridHelper(gridSize, gridDivisions, 0x4a90e2, 0x1a1a2e);
    gridHelperXY.position.y = 0;
    gridHelperXY.material.transparent = true;
    gridHelperXY.material.opacity = 0.15; // Slightly increase visibility
    this.scene.add(gridHelperXY);

    this.gridHelper = gridHelperXY; // Save reference for animation
  }

  private createParticleField(enableParticles = true) {
    if (!enableParticles) return;

    // Create particle field - simulate cosmic dust, reduce count for better performance
    const particleCount = 200; // Reduced from 500 to 200
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Random positions, reduced range
      positions[i * 3] = (Math.random() - 0.5) * 80;     // Reduced from 100 to 80
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40; // Reduced from 50 to 40
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80; // Reduced from 100 to 80

      // Particle colors - blue-purple tones
      colors[i * 3] = 0.25 + Math.random() * 0.25;     // R
      colors[i * 3 + 1] = 0.25 + Math.random() * 0.25; // G
      colors[i * 3 + 2] = 0.5 + Math.random() * 0.5;   // B
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.3, // Reduced particle size from 0.5 to 0.3
      vertexColors: true,
      transparent: true,
      opacity: 0.5, // Lower opacity from 0.6 to 0.5
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particleSystem);
  }

  private createSpotlights() {
    // Create main spotlight - illuminate center area from above
    const mainSpotlight = new THREE.SpotLight(0xffffff, 3.0); // Increased from 2.5 to 3.0 for brighter illumination
    mainSpotlight.position.set(0, 20, 12); // Raise position further and move forward
    mainSpotlight.target.position.set(0, 0, 0);
    mainSpotlight.angle = Math.PI / 4.5; // Increased to ~40° cone angle for wider coverage
    mainSpotlight.penumbra = 0.1; // Soft edges
    mainSpotlight.decay = 1.5; // Softer attenuation
    mainSpotlight.distance = 45; // Increased to 45 for longer reach
    mainSpotlight.castShadow = true;

    // Configure shadows
    mainSpotlight.shadow.mapSize.width = 2048;
    mainSpotlight.shadow.mapSize.height = 2048;
    mainSpotlight.shadow.camera.near = 0.5;
    mainSpotlight.shadow.camera.far = 40; // Increased shadow distance
    mainSpotlight.shadow.bias = -0.0001;

    this.scene.add(mainSpotlight);
    this.scene.add(mainSpotlight.target);

    // Create auxiliary spotlight - fill light from side
    const sideSpotlight1 = new THREE.SpotLight(0x6aa0ff, 1.8); // Increased from 1.5 to 1.8, brighter blue
    sideSpotlight1.position.set(-18, 12, 10); // Adjust position further out and higher
    sideSpotlight1.target.position.set(-4, 0, 0);
    sideSpotlight1.angle = Math.PI / 6; // Increased to 30° cone angle
    sideSpotlight1.penumbra = 0.2;
    sideSpotlight1.decay = 1.5;
    sideSpotlight1.distance = 35; // Increased from 28 to 35
    sideSpotlight1.castShadow = true;

    sideSpotlight1.shadow.mapSize.width = 1024;
    sideSpotlight1.shadow.mapSize.height = 1024;
    sideSpotlight1.shadow.camera.near = 0.5;
    sideSpotlight1.shadow.camera.far = 30; // Increased shadow distance

    this.scene.add(sideSpotlight1);
    this.scene.add(sideSpotlight1.target);

    // Create another auxiliary spotlight - fill light from other side
    const sideSpotlight2 = new THREE.SpotLight(0xa06aff, 1.6); // Increased from 1.3 to 1.6, brighter purple
    sideSpotlight2.position.set(18, 12, 10); // Adjust position further out and higher
    sideSpotlight2.target.position.set(4, 0, 0);
    sideSpotlight2.angle = Math.PI / 6;
    sideSpotlight2.penumbra = 0.2;
    sideSpotlight2.decay = 1.5;
    sideSpotlight2.distance = 35; // Increased from 28 to 35
    sideSpotlight2.castShadow = true;

    sideSpotlight2.shadow.mapSize.width = 1024;
    sideSpotlight2.shadow.mapSize.height = 1024;
    sideSpotlight2.shadow.camera.near = 0.5;
    sideSpotlight2.shadow.camera.far = 30; // Increased shadow distance

    this.scene.add(sideSpotlight2);
    this.scene.add(sideSpotlight2.target);
  }

  private createHolographicElements(enableHolographicElements = true) {
    if (!enableHolographicElements) return;

    // Create holographic rings
    this.createHolographicRings();
    // Create tech lines
    this.createTechLines();
  }

  private createHolographicRings() {
    // Create only one main holographic ring for better performance
    const ringGeometry = new THREE.RingGeometry(8, 8.2, 32); // Reduce vertex count from 64 to 32
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.15,
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

    // Create arc-shaped lines around center - concentrated in periphery
    const arcCount = 4; // 4 arc lines
    const radius = 15; // Arc radius

    for (let i = 0; i < arcCount; i++) {
      const points = [];
      const segments = 12; // Number of segments per arc

      // Calculate arc starting angle
      const startAngle = (i / arcCount) * Math.PI * 2;
      const arcAngle = Math.PI * 0.7; // Angle span per arc (252 degrees)

      for (let j = 0; j <= segments; j++) {
        const angle = startAngle + (arcAngle * j / segments);

        // Use elliptical orbit instead of circle for more interesting effect
        const x = Math.cos(angle) * radius * 0.8;
        const z = Math.sin(angle) * radius;

        // Make lines extend from ground up, with height varying by angle
        const heightVariation = Math.sin(angle * 2) * 2;
        const y = Math.max(0.5, Math.abs(heightVariation) + 2);

        points.push(new THREE.Vector3(x, y, z));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x4a90e2,
        transparent: true,
        opacity: 0.25
      });

      const line = new THREE.Line(geometry, material);
      const lineGroup = new THREE.Group();
      lineGroup.add(line);
      this.scene.add(lineGroup);
      lines.push(lineGroup);
    }

    // Add vertical support lines connecting arcs to ground
    const supportLineCount = 6;
    for (let i = 0; i < supportLineCount; i++) {
      const angle = (i / supportLineCount) * Math.PI * 2;
      const distance = radius * 0.9; // Slightly less than arc radius

      const points = [
        new THREE.Vector3(
          Math.cos(angle) * distance * 0.8,
          12, // Start from higher position
          Math.sin(angle) * distance
        ),
        new THREE.Vector3(
          Math.cos(angle) * distance * 0.8,
          0, // Extend to ground
          Math.sin(angle) * distance
        )
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x4a90e2,
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

  // Animation update method
  update(deltaTime: number) {
    // Slight rotation of particle system
    if (this.particleSystem) {
      this.particleSystem.rotation.y += deltaTime * 0.01;
    }

    // Holographic element animations
    this.holographicElements.forEach((element, index) => {
      element.rotation.y += deltaTime * 0.005 * (index + 1);
      element.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material && 'opacity' in child.material) {
          // Create pulsing effect
          const pulse = Math.sin(Date.now() * 0.001 + index) * 0.1 + 0.1;
          (child.material as THREE.Material).opacity = Math.max(0.05, pulse);
        }
      });
    });

    // Subtle grid flickering
    if (this.gridHelper && this.gridHelper.material) {
      const flicker = Math.sin(Date.now() * 0.002) * 0.05 + 0.1;
      (this.gridHelper.material as THREE.Material).opacity = Math.max(0.05, flicker);
    }
  }

  // Clean up resources
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
