import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const modelsDir = path.join(process.cwd(), 'public', 'models');

    if (!fs.existsSync(modelsDir)) {
      return NextResponse.json({ files: [] });
    }

    const entries = fs.readdirSync(modelsDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /\.(glb|gltf)$/i.test(entry.name))
      .map((entry) => ({
        name: entry.name,
        url: `/models/${entry.name}`,
      }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Failed to list models:', error);
    return NextResponse.json({ error: 'Failed to list models' }, { status: 500 });
  }
}


