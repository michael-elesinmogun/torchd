import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { roomId, userId, role } = await request.json();

    const accessKey = process.env.HMS_ACCESS_KEY;
    const secret = process.env.HMS_SECRET;

    if (!accessKey || !secret) {
      return NextResponse.json({ error: '100ms credentials not configured' }, { status: 500 });
    }

    // Generate JWT token for 100ms
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      access_key: accessKey,
      room_id: roomId,
      user_id: userId,
      role: role || 'host',
      type: 'app',
      version: 2,
      iat: now,
      nbf: now,
      exp: now + 86400, // 24 hours
    };

    // Base64url encode
    function base64url(obj) {
      return Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    }

    const headerB64 = base64url(header);
    const payloadB64 = base64url(payload);
    const signingInput = `${headerB64}.${payloadB64}`;

    // HMAC-SHA256 signature
    const crypto = await import('crypto');
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
    console.error('100ms token error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}