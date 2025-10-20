import type { SceneConfigParams } from './types';

export async function readSceneConfig(params: SceneConfigParams): Promise<string | null> {
  const { suiClient, packageId, kioskId } = params;
  
  try {
    // Primary method: Direct getDynamicFieldObject call
    const resp = await suiClient.getDynamicFieldObject({
      parentId: kioskId,
      name: {
        type: `${packageId}::pavilion::SceneConfig`,
        value: {},
      },
    });
    
    // Extract the JSON string from the dynamic field
    const value = resp?.data?.content?.fields?.value;
    
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    
    return null;
    
  } catch {
    // Fallback method: Use getDynamicFields to find the field first
    try {
      const fieldsResp = await suiClient.getDynamicFields({
        parentId: kioskId,
      });
      
      if (fieldsResp?.data && Array.isArray(fieldsResp.data)) {
        const sceneConfigField = fieldsResp.data.find((field: any) => {
          const fieldType = field?.name?.type;
          return fieldType?.includes('SceneConfig');
        });
        
        if (sceneConfigField) {
          const fieldResp = await suiClient.getDynamicFieldObject({
            parentId: kioskId,
            name: sceneConfigField.name,
          });
          
          const value = fieldResp?.data?.content?.fields?.value;
          if (typeof value === 'string' && value.length > 0) {
            return value;
          }
        }
      }
    } catch (fallbackError) {
      // Silently fail
    }
    
    return null;
  }
}

export async function readPavilionName(params: SceneConfigParams): Promise<string | null> {
  const { suiClient, packageId, kioskId } = params;
  
  try {
    const resp = await suiClient.getDynamicFieldObject({
      parentId: kioskId,
      name: {
        type: `${packageId}::pavilion::PavilionName`,
        value: {},
      },
    });
    
    const value = resp?.data?.content?.fields?.value;
    if (typeof value === 'string' && value.length > 0) return value;
    return null;
    
  } catch {
    try {
      const fieldsResp = await suiClient.getDynamicFields({ parentId: kioskId });
      const match = fieldsResp?.data?.find((f: any) => f?.name?.type?.includes('PavilionName'));
      
      if (match) {
        const fieldResp = await suiClient.getDynamicFieldObject({ 
          parentId: kioskId, 
          name: match.name 
        });
        const value = fieldResp?.data?.content?.fields?.value;
        if (typeof value === 'string' && value.length > 0) return value;
      }
    } catch {
      // Ignore fallback errors
    }
    
    return null;
  }
}
