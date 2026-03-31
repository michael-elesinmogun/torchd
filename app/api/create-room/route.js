import { NextResponse } from 'next/server';
import crypto from 'crypto';

function makeJwt(accessKey, secret, extraPayload = {}) {
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const payload = btoa(JSON.stringify({
    access_key: accessKey,
    version: 2,
    iat: now,
    nbf: now,
    exp: now + 86400,
    ...extraPayload,
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${header}.${payload}.${sig}`;
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
      return NextResponse.json({ error: 'HMS_TEMPLATE_ID not set in env vars' }, { status: 500 });
    }

    const mgmtToken = makeJwt(accessKey, secret, { type: 'management' });

    console.log('Creating 100ms room for battle:', battleId);
    console.log('Template ID:', templateId);

    const roomRes = await fetch('https://api.100ms.live/v2/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mgmtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `torchd-${battleId.slice(0, 20)}`,
        description: topic || 'Torchd Battle',
        template_id: templateId,
      }),
    });

    const roomData = await roomRes.json();
    console.log('100ms room response:', JSON.stringify(roomData));

    if (!roomRes.ok) {
      return NextResponse.json({
        error: roomData.message || roomData.error || 'Failed to create room',
        details: roomData,
      }, { status: 500 });
    }

    return NextResponse.json({ roomId: roomData.id, roomName: roomData.name });
  } catch (err) {
    console.error('Create room error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}