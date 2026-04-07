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
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch gamecast' }, { status: 500 });
    }

    const data = await res.json();

    const headerPeriod = data.header?.competitions?.[0]?.status?.period || null;

    const plays = (data.plays || []).slice(-200).reverse().map(play => {
      let periodNumber = null;

      // 1. period.number if positive
      if (play.period?.number && play.period.number > 0) {
        periodNumber = play.period.number;
      }

      // 2. Parse digit from period.displayValue: "1st Inning", "Top 3rd Inning", etc.
      if (!periodNumber && play.period?.displayValue) {
        const m = play.period.displayValue.match(/(\d+)/);
        if (m) periodNumber = parseInt(m[1], 10);
      }

      // 3. Parse digit from play.text for baseball e.g. "End of 2nd inning"
      if (!periodNumber && play.text) {
        const m = play.text.match(/(\d+)(?:st|nd|rd|th)\s+inning/i);
        if (m) periodNumber = parseInt(m[1], 10);
      }

      // 4. Fall back to current game period from header
      if (!periodNumber && headerPeriod) {
        periodNumber = headerPeriod;
      }

      return {
        id: play.id,
        text: play.text,
        clock: play.clock?.displayValue,
        period: periodNumber,
        periodText: play.period?.displayValue,
        team: play.team?.abbreviation,
        teamLogo: play.team?.logo || null,
        teamColor: play.team?.color || null,
        scoreValue: play.scoreValue,
        scoringPlay: play.scoringPlay,
        awayScore: play.awayScore,
        homeScore: play.homeScore,
        type: play.type?.text,
      };
    });

    const boxscore = data.boxscore || {};
    const teams = boxscore.teams || [];

    const teamStats = teams.map(team => ({
      team: team.team?.abbreviation,
      name: team.team?.displayName,
      logo: team.team?.logo,
      color: team.team?.color,
      homeAway: team.homeAway,
      statistics: (team.statistics || []).map(s => ({
        name: s.name,
        displayValue: s.displayValue,
        label: s.label,
        abbreviation: s.abbreviation,
      })),
    }));

    const players = (boxscore.players || []).map(teamPlayers => ({
      team: teamPlayers.team?.abbreviation,
      teamName: teamPlayers.team?.displayName,
      teamLogo: teamPlayers.team?.logo,
      teamColor: teamPlayers.team?.color,
      homeAway: teamPlayers.homeAway,
      statistics: (teamPlayers.statistics || []).map(statGroup => ({
        name: statGroup.name,
        keys: statGroup.keys || [],
        labels: statGroup.labels || [],
        athletes: (statGroup.athletes || []).map(athlete => ({
          id: athlete.athlete?.id,
          name: athlete.athlete?.displayName,
          shortName: athlete.athlete?.shortName,
          jersey: athlete.athlete?.jersey,
          position: athlete.athlete?.position?.abbreviation,
          starter: athlete.starter,
          active: athlete.active,
          stats: athlete.stats || [],
          didNotPlay: athlete.didNotPlay,
          reason: athlete.reason,
        })),
      })),
    }));

    const header = data.header || {};
    const competition = header.competitions?.[0] || {};
    const status = competition.status || {};

    return Response.json({
      plays,
      teamStats,
      players,
      sport,
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