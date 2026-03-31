import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { roomId, userId, role } = await request.json();

    const accessKey = process.env.HMS_ACCESS_KEY;
    const secret = process.env.HMS_SECRET;

    if (!accessKey || !secret) {
      return NextResponse.json({ error: '100ms credentials not configured' }, { status: 500 });
    }

    const encode = (obj) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      access_key: accessKey,
      room_id: roomId,
      user_id: userId || 'user',
      role: role || 'host',
      type: 'app',
      version: 2,
      iat: now,
      nbf: now,
      exp: now + 86400,
    };

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

    const token = `${signingInput}.${signature}`;

    return NextResponse.json({ token });
  } catch (err) {
    console.error('HMS token error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}