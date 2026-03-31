import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    const { roomId, userId, role } = await request.json();

    const accessKey = process.env.HMS_ACCESS_KEY;
    const secret = process.env.HMS_SECRET;

    if (!accessKey || !secret) {
      return NextResponse.json({ error: '100ms credentials not configured' }, { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);

    const token = jwt.sign(
      {
        access_key: accessKey,
        type: 'app',
        version: 2,
        room_id: roomId,
        user_id: userId || 'user',
        role: role || 'host',
        iat: now,
        nbf: now,
      },
      secret,
      {
        algorithm: 'HS256',
        expiresIn: '24h',
        jwtid: crypto.randomUUID(),
      }
    );

    return NextResponse.json({ token });
  } catch (err) {
    console.error('HMS token error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}