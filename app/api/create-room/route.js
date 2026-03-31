import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateHmsToken(accessKey, secret, type = 'management') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    access_key: accessKey,
    type,
    version: 2,
    iat: now,
    nbf: now,
    exp: now + 86400,
  };

  const encode = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${signature}`;
}

export async function POST(request) {
  try {
    const { battleId, topic } = await request.json();

    const accessKey = process.env.HMS_ACCESS_KEY;
    const secret = process.env.HMS_SECRET;
    const templateId = process.env.HMS_TEMPLATE_ID;

    if (!accessKey || !secret) {
      return NextResponse.json({ error: '100ms credentials not configured' }, { status: 500 });
    }

    if (!templateId) {
      return NextResponse.json({ error: 'HMS_TEMPLATE_ID not configured' }, { status: 500 });
    }

    const mgmtToken = generateHmsToken(accessKey, secret, 'management');

    // Create room via 100ms API
    const roomRes = await fetch('https://api.100ms.live/v2/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mgmtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `torchd-battle-${battleId}`,
        description: topic || 'Torchd Battle',
        template_id: templateId,
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