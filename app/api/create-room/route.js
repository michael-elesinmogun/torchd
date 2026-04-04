import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

export async function POST(request) {
  try {
    const { battleId } = await request.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 500 });
    }

    // Convert wss:// to https:// for the REST API
    const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');

    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

    const roomName = `torchd-battle-${battleId}`;

    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 600,      // delete after 10 min empty
      maxParticipants: 50,    // viewers + debaters
    });

    return NextResponse.json({ roomName });
  } catch (err) {
    console.error('Create room error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}