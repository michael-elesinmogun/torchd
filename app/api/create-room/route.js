import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

export async function POST(request) {
  try {
    const { battleId } = await request.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({
        error: `LiveKit credentials not configured. Key: ${!!apiKey}, Secret: ${!!apiSecret}, URL: ${!!livekitUrl}`
      }, { status: 500 });
    }

    // LiveKit SDK needs https:// not wss://
    const httpUrl = livekitUrl
      .replace('wss://', 'https://')
      .replace('ws://', 'http://');

    const roomName = `torchd-battle-${battleId}`;

    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);

    try {
      await svc.createRoom({
        name: roomName,
        emptyTimeout: 600,
        maxParticipants: 50,
      });
    } catch (roomErr) {
      // Room may already exist — that's fine
      console.log('Room creation note:', roomErr.message);
    }

    return NextResponse.json({ roomName });
  } catch (err) {
    console.error('Create room error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}