const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('開始下載測試 GLB 模型...');

const outputPath = path.join(__dirname, '../public/models/test-cube.glb');

// 下載一個簡單的 GLB 檔案（來自 glTF-Sample-Models）
const url = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb';

const file = fs.createWriteStream(outputPath);

https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error('下載失敗，狀態碼:', response.statusCode);
    file.close();
    fs.unlinkSync(outputPath);
    return;
  }

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log(`GLB 檔案已下載: ${outputPath}`);
    console.log('這是一個簡單的立方體模型，可以用來測試載入功能');
  });
}).on('error', (err) => {
  console.error('下載錯誤:', err.message);
  file.close();
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  // 創建一個基本的替代檔案
  createBasicCube(outputPath);
});

function createBasicCube(outputPath) {
  console.log('創建基本的立方體 GLB 檔案...');

  // 創建一個簡單的立方體 GLB 檔案
  const gltfData = {
    asset: { version: "2.0", generator: "Pavilion GLB Generator" },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0 },
        material: 0,
        indices: 1
      }]
    }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: [0.8, 0.8, 0.8, 1.0],
        metallicFactor: 0.5,
        roughnessFactor: 0.5
      }
    }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 8,
        type: "VEC3",
        max: [0.5, 0.5, 0.5],
        min: [-0.5, -0.5, -0.5]
      },
      {
        bufferView: 1,
        componentType: 5123,
        count: 36,
        type: "SCALAR"
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 96 },
      { buffer: 0, byteOffset: 96, byteLength: 72 }
    ],
    buffers: [{ byteLength: 168 }]
  };

  const jsonStr = JSON.stringify(gltfData);
  const jsonBuffer = Buffer.from(jsonStr);
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  const paddedJsonBuffer = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding)]);

  // 立方體頂點數據
  const vertices = new Float32Array([
    -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5, -0.5
  ]);

  // 立方體索引
  const indices = new Uint16Array([
    0, 1, 2, 2, 3, 0, 4, 5, 6, 6, 7, 4,
    0, 3, 6, 6, 5, 0, 1, 2, 7, 7, 4, 1,
    2, 3, 6, 6, 7, 2, 0, 1, 4, 4, 5, 0
  ]);

  const binaryBuffer = Buffer.alloc(168);
  vertices.forEach((val, i) => binaryBuffer.writeFloatLE(val, i * 4));
  indices.forEach((val, i) => binaryBuffer.writeUInt16LE(val, 96 + i * 2));

  // GLB 標頭
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546C67, 0); // magic
  header.writeUInt32LE(2, 4); // version
  header.writeUInt32LE(20 + 8 + paddedJsonBuffer.length + 8 + binaryBuffer.length, 8); // total length

  // JSON chunk header
  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(paddedJsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // JSON

  // Binary chunk header
  const binaryChunkHeader = Buffer.alloc(8);
  binaryChunkHeader.writeUInt32LE(binaryBuffer.length, 0);
  binaryChunkHeader.writeUInt32LE(0x004E4942, 4); // BIN

  const finalBuffer = Buffer.concat([
    header,
    jsonChunkHeader,
    paddedJsonBuffer,
    binaryChunkHeader,
    binaryBuffer
  ]);

  fs.writeFileSync(outputPath, finalBuffer);
  console.log(`基本的 GLB 檔案已創建: ${outputPath}`);
}