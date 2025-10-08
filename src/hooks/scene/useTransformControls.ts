import { useCallback } from 'react';
import * as THREE from 'three';

/**
 * Transform control logic (position, rotation, scale) management hook
 */

// Extended controllable object type with Three.js object
interface ControllableObjectWithObject {
  id: string;
  name: string;
  type: 'sculpture' | 'external' | 'kiosk_nft';
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  object?: THREE.Object3D;
}

export function useTransformControls() {
  /**
   * Update external model position
   */
  const handleExternalPositionUpdate = useCallback(<T extends ControllableObjectWithObject>(
    objectId: string,
    position: { x: number; y: number; z: number },
    controllableObjects: T[],
    setControllableObjects: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    const controllableObj = controllableObjects.find(obj => obj.id === objectId);
    if (controllableObj && controllableObj.object) {
      controllableObj.object.position.set(position.x, position.y, position.z);
      controllableObj.position = position;
      setControllableObjects([...controllableObjects]);
    }
  }, []);

  /**
   * Update external model rotation
   */
  const handleExternalRotationUpdate = useCallback(<T extends ControllableObjectWithObject>(
    objectId: string,
    rotation: { x: number; y: number; z: number },
    controllableObjects: T[],
    setControllableObjects: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    const controllableObj = controllableObjects.find(obj => obj.id === objectId);
    if (controllableObj && controllableObj.object) {
      controllableObj.object.rotation.set(rotation.x, rotation.y, rotation.z);
      controllableObj.rotation = rotation;
      setControllableObjects([...controllableObjects]);
    }
  }, []);

  /**
   * Update external model scale
   */
  const handleExternalScaleUpdate = useCallback(<T extends ControllableObjectWithObject>(
    objectId: string,
    scale: { x: number; y: number; z: number },
    controllableObjects: T[],
    setControllableObjects: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    const controllableObj = controllableObjects.find(obj => obj.id === objectId);
    if (controllableObj && controllableObj.object) {
      controllableObj.object.scale.set(scale.x, scale.y, scale.z);
      controllableObj.scale = scale;
      setControllableObjects([...controllableObjects]);
    }
  }, []);

  return {
    handleExternalPositionUpdate,
    handleExternalRotationUpdate,
    handleExternalScaleUpdate,
  };
}

