import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(request) {
  try {
    const { roomName, participantName, canPublish } = await request.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: '24h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: canPublish ?? true,   // debaters publish, viewers don't
      canSubscribe: true,               // everyone can watch
      canPublishData: true,
    });

    const token = await at.toJwt();
    return NextResponse.json({ token });
  } catch (err) {
    console.error('LiveKit token error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}