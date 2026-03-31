import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { battleId } = await request.json();

    // Jitsi needs no API key — just a unique room name
    const roomName = `torchd-${battleId.replace(/-/g, '').slice(0, 20)}`;
    const roomUrl = `https://meet.jit.si/${roomName}`;

    return NextResponse.json({ roomUrl, roomName });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}