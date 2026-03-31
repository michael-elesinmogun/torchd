import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { battleId, topic } = await request.json();

    const accessKey = process.env.HMS_ACCESS_KEY;
    const secret = process.env.HMS_SECRET;

    if (!accessKey || !secret) {
      return NextResponse.json({ error: '100ms credentials not configured' }, { status: 500 });
    }

    // Generate management token for 100ms API
    const crypto = await import('crypto');

    function base64url(obj) {
      return Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      access_key: accessKey,
      type: 'management',
      version: 2,
      iat: now,
      nbf: now,
      exp: now + 86400,
    };

    const headerB64 = base64url(header);
    const payloadB64 = base64url(payload);
    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signingInput)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const mgmtToken = `${signingInput}.${signature}`;

    // Create a room via 100ms API
    const roomRes = await fetch('https://api.100ms.live/v2/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mgmtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `torchd-battle-${battleId}`,
        description: topic || 'Torchd Battle',
        template_id: process.env.HMS_TEMPLATE_ID || undefined,
      }),
    });

    const roomData = await roomRes.json();

    if (!roomRes.ok) {
      console.error('100ms room creation error:', roomData);
      return NextResponse.json({ error: roomData.message || 'Failed to create room' }, { status: 500 });
    }

    return NextResponse.json({ roomId: roomData.id, roomName: roomData.name });
  } catch (err) {
    console.error('Create room error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}