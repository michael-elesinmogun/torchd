import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { battleId } = await request.json();
    const roomName = `td${battleId.replace(/-/g, '').slice(0, 8)}`;
    const roomUrl = `https://meet.jit.si/${roomName}`;
    return NextResponse.json({ roomUrl, roomName });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}