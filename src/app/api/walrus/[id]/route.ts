import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_AGGREGATOR = process.env.WALRUS_AGGREGATOR || 'https://aggregator.walrus-testnet.walrus.space';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing blob id' }, { status: 400 });
    }

    const url = new URL(req.url);
    const overrideAgg = url.searchParams.get('aggregator');
    const aggregatorBase = overrideAgg || DEFAULT_AGGREGATOR;

    const upstreamUrl = `${aggregatorBase.replace(/\/$/, '')}/v1/blobs/${encodeURIComponent(id)}`;

    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      // Avoid caching issues and allow streaming if upstream supports it
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json(
        { error: `Upstream error ${upstream.status}`, detail: text?.slice(0, 500) },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await upstream.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=3600, immutable',
      },
    });
  } catch (error) {
    console.error('Walrus proxy failed:', error);
    return NextResponse.json({ error: 'Failed to fetch Walrus blob' }, { status: 500 });
  }
}


