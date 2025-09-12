import * as THREE from 'three';

export interface SculptureConfig {
  id: string;
  name: string;
  type: 'torusKnot' | 'icosahedron' | 'box' | 'sphere' | 'cylinder';
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation?: {
    x: number;
    y: number;
    z: number;
  };
  scale?: {
    x: number;
    y: number;
    z: number;
  };
  material: {
    color: number;
    metalness?: number;
    roughness?: number;
  };
  geometry?: {
    // Special parameters for different types
    radius?: number;
    width?: number;
    height?: number;
    depth?: number;
    segments?: number;
  };
}

export interface SculptureInstance {
  config: SculptureConfig;
  mesh: THREE.Mesh;
}

// Default sculpture configurations
export const defaultSculptures: SculptureConfig[] = [
  {
    id: 'sculpture-1',
    name: 'Torus Knot Sculpture',
    type: 'torusKnot',
    position: { x: -5, y: 1, z: 0 },
    material: { color: 0xff0000, metalness: 0.5, roughness: 0.5 }
  },
  {
    id: 'sculpture-2', 
    name: 'Polyhedron Sculpture',
    type: 'icosahedron',
    position: { x: 5, y: 1.5, z: 0 },
    material: { color: 0x00ff00, metalness: 0.8, roughness: 0.2 },
    geometry: { radius: 1.5 }
  },
  {
    id: 'sculpture-3',
    name: 'Cube Sculpture', 
    type: 'box',
    position: { x: 0, y: 1.5, z: 5 },
    material: { color: 0x0000ff, metalness: 0.6, roughness: 0.4 },
    geometry: { width: 1, height: 3, depth: 1 }
  }
];

// Geometry creation functions corresponding to sculpture types
export const sculptureGeometryFactories = {
  torusKnot: () => 
    new THREE.TorusKnotGeometry(1, 0.3, 20, 16, 51, 13),
  
  icosahedron: (config: SculptureConfig) => 
    new THREE.IcosahedronGeometry(config.geometry?.radius || 1.5),
  
  box: (config: SculptureConfig) => 
    new THREE.BoxGeometry(
      config.geometry?.width || 1,
      config.geometry?.height || 1, 
      config.geometry?.depth || 1
    ),
  
  sphere: (config: SculptureConfig) =>
    new THREE.SphereGeometry(config.geometry?.radius || 1, 32, 32),
  
  cylinder: (config: SculptureConfig) =>
    new THREE.CylinderGeometry(
      config.geometry?.radius || 1,
      config.geometry?.radius || 1,
      config.geometry?.height || 2,
      config.geometry?.segments || 32
    )
};
