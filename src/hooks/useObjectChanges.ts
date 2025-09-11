import { useState, useCallback } from 'react';

export interface ObjectChange {
  objectId: string;
  objectName: string;
  originalState: {
    displayed: boolean;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: number;
  };
  currentState: {
    displayed: boolean;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: number;
  };
}

export function useObjectChanges() {
  const [objectChanges, setObjectChanges] = useState<Map<string, ObjectChange>>(new Map());

  // Track changes for kiosk NFT items
  const trackKioskNftChange = useCallback((
    objectId: string,
    objectName: string,
    property: string,
    fromValue: any,
    toValue: any,
    displayedItems: Set<string>,
    transforms: Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>
  ) => {
    setObjectChanges(prev => {
      const newMap = new Map(prev);
      const existingChange = newMap.get(objectId);

      if (existingChange) {
        // Update existing change
        const updatedChange = { ...existingChange };
        updatedChange.currentState = { ...updatedChange.currentState };

        switch (property) {
          case 'displayed':
            updatedChange.currentState.displayed = toValue;
            break;
          case 'position':
            updatedChange.currentState.position = toValue;
            break;
          case 'rotation':
            updatedChange.currentState.rotation = toValue;
            break;
          case 'scale':
            updatedChange.currentState.scale = toValue;
            break;
        }

        newMap.set(objectId, updatedChange);
      } else {
        // Create new change tracking
        const currentTransform = transforms.get(objectId) || {
          position: { x: 0, y: 2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        };

        const newChange: ObjectChange = {
          objectId,
          objectName,
          originalState: {
            displayed: displayedItems.has(objectId),
            position: currentTransform.position,
            rotation: currentTransform.rotation,
            scale: currentTransform.scale.x
          },
          currentState: {
            displayed: displayedItems.has(objectId),
            position: currentTransform.position,
            rotation: currentTransform.rotation,
            scale: currentTransform.scale.x
          }
        };

        // Apply the specific change
        switch (property) {
          case 'displayed':
            newChange.currentState.displayed = toValue;
            break;
          case 'position':
            newChange.currentState.position = toValue;
            break;
          case 'rotation':
            newChange.currentState.rotation = toValue;
            break;
          case 'scale':
            newChange.currentState.scale = toValue;
            break;
        }

        newMap.set(objectId, newChange);
      }

      return newMap;
    });
  }, []);

  // Clear all changes
  const clearChanges = useCallback(() => {
    setObjectChanges(new Map());
  }, []);

  // Check if there are unsaved changes
  const hasUnsavedChanges = objectChanges.size > 0;

  return {
    objectChanges,
    trackKioskNftChange,
    clearChanges,
    hasUnsavedChanges
  };
}
