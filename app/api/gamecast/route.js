export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  const sport = searchParams.get('sport') || 'nba';

  if (!gameId) {
    return Response.json({ error: 'gameId required' }, { status: 400 });
  }

  const sportPaths = {
    nba: 'basketball/nba',
    nfl: 'football/nfl',
    mlb: 'baseball/mlb',
    nhl: 'hockey/nhl',
  };

  const sportPath = sportPaths[sport] || 'basketball/nba';
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/summary?event=${gameId}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 15 },
    });

    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch gamecast' }, { status: 500 });
    }

    const data = await res.json();

    // Extract plays
    const plays = (data.plays || []).slice(-30).reverse().map(play => ({
      id: play.id,
      text: play.text,
      clock: play.clock?.displayValue,
      period: play.period?.number,
      periodText: play.period?.displayValue,
      team: play.team?.abbreviation,
      scoreValue: play.scoreValue,
      scoringPlay: play.scoringPlay,
      awayScore: play.awayScore,
      homeScore: play.homeScore,
      type: play.type?.text,
    }));

    // Extract leaders
    const boxscore = data.boxscore || {};
    const teams = boxscore.teams || [];

    const leaders = teams.map(team => ({
      team: team.team?.abbreviation,
      color: team.team?.color,
      statistics: (team.statistics || []).slice(0, 4).map(s => ({
        name: s.name,
        displayValue: s.displayValue,
        label: s.label,
      })),
    }));

    // Game status
    const header = data.header || {};
    const competition = header.competitions?.[0] || {};
    const status = competition.status || {};

    return Response.json({
      plays,
      leaders,
      status: {
        type: status.type?.name,
        detail: status.type?.detail,
        clock: status.displayClock,
        period: status.period,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}