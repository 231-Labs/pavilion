import { requestSuiFromFaucetV2, getFaucetHost } from '@mysten/sui/faucet';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { recipient } = await request.json();
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient address is required' }, { status: 400 });
    }

    const result = await requestSuiFromFaucetV2({
      host: getFaucetHost('testnet'),
      recipient,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Faucet API error:', error);
    return NextResponse.json({ error: 'Failed to request from faucet' }, { status: 500 });
  }
}
