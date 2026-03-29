export async function POST(request) {
  const { battleId, topic } = await request.json();

  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'Daily API key not configured' }, { status: 500 });
  }

  try {
    // Create a Daily room for this battle
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: `torchd-battle-${battleId}`,
        properties: {
          max_participants: 10,
          enable_chat: false,
          enable_screenshare: false,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3, // expires in 3 hours
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Room may already exist — try to fetch it
      if (data.error === 'invalid-request-error') {
        const getResponse = await fetch(`https://api.daily.co/v1/rooms/torchd-battle-${battleId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        const existingRoom = await getResponse.json();
        return Response.json({ url: existingRoom.url, name: existingRoom.name });
      }
      return Response.json({ error: data.error }, { status: 400 });
    }

    return Response.json({ url: data.url, name: data.name });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}