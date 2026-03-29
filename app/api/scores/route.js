export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'nba';

  const endpoints = {
    nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
    nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  };

  const url = endpoints[sport];
  if (!url) {
    return Response.json({ error: 'Invalid sport' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 30 }, // cache for 30 seconds
    });

    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch scores' }, { status: 500 });
    }

    const data = await res.json();
    const events = data.events || [];

    const games = events.map(event => {
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors || [];
      const home = competitors.find(c => c.homeAway === 'home');
      const away = competitors.find(c => c.homeAway === 'away');
      const status = competition?.status;

      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        date: event.date,
        status: {
          type: status?.type?.name,
          description: status?.type?.description,
          detail: status?.type?.detail || status?.displayClock,
          shortDetail: status?.type?.shortDetail,
          period: status?.period,
          clock: status?.displayClock,
          completed: status?.type?.completed,
        },
        home: {
          id: home?.team?.id,
          name: home?.team?.displayName,
          abbr: home?.team?.abbreviation,
          logo: home?.team?.logo,
          color: home?.team?.color,
          score: home?.score,
          record: home?.records?.[0]?.summary,
        },
        away: {
          id: away?.team?.id,
          name: away?.team?.displayName,
          abbr: away?.team?.abbreviation,
          logo: away?.team?.logo,
          color: away?.team?.color,
          score: away?.score,
          record: away?.records?.[0]?.summary,
        },
        venue: competition?.venue?.fullName,
        broadcast: competition?.broadcasts?.[0]?.names?.[0],
      };
    });

    return Response.json({ games, sport, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}