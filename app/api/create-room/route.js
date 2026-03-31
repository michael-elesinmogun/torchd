import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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
      return NextResponse.json({ error: 'HMS_TEMPLATE_ID not set' }, { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);

    const mgmtToken = jwt.sign(
      {
        access_key: accessKey,
        type: 'management',
        version: 2,
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

    console.log('Creating 100ms room, templateId:', templateId);

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
    console.log('100ms response:', JSON.stringify(roomData));

    if (!roomRes.ok) {
      return NextResponse.json({
        error: roomData.message || 'Failed to create room',
      }, { status: 500 });
    }

    return NextResponse.json({ roomId: roomData.id, roomName: roomData.name });
  } catch (err) {
    console.error('Create room error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}