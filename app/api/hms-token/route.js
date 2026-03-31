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
    const { roomId, userId, role } = await request.json();

    const accessKey = process.env.HMS_ACCESS_KEY;
    const secret = process.env.HMS_SECRET;

    if (!accessKey || !secret) {
      return NextResponse.json({ error: '100ms credentials not configured' }, { status: 500 });
    }

    const token = makeJwt(accessKey, secret, {
      type: 'app',
      room_id: roomId,
      user_id: userId || 'user',
      role: role || 'host',
    });

    console.log('Generated HMS token for room:', roomId, 'user:', userId);

    return NextResponse.json({ token });
  } catch (err) {
    console.error('HMS token error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}