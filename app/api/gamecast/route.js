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

    // Build an atBat → inning map from MLB scoring plays / at-bats if available
    // ESPN sometimes buries the inning in at-bat data rather than play.period
    const atBatInningMap = {};
    if (sport === 'mlb' && data.atBats) {
      for (const ab of data.atBats) {
        if (ab.id && ab.period?.number > 0) {
          atBatInningMap[String(ab.id)] = ab.period.number;
        }
      }
    }

    const headerPeriod = data.header?.competitions?.[0]?.status?.period || null;

    const plays = (data.plays || []).slice(-200).reverse().map(play => {
      // 1. Trust period.number if it's a positive integer
      let periodNumber = (play.period?.number && play.period.number > 0)
        ? play.period.number
        : null;

      // 2. Parse any digit from period.displayValue e.g. "1st Inning", "Top 3rd"
      if (!periodNumber && play.period?.displayValue) {
        const m = play.period.displayValue.match(/(\d+)/);
        if (m) periodNumber = parseInt(m[1], 10);
      }

      // 3. Try atBat map (MLB only)
      if (!periodNumber && play.atBatId) {
        periodNumber = atBatInningMap[String(play.atBatId)] || null;
      }

      // 4. Parse from play type text e.g. "End of 2nd"
      if (!periodNumber && play.type?.text) {
        const m = play.type.text.match(/(\d+)/);
        if (m) periodNumber = parseInt(m[1], 10);
      }

      // 5. Last resort — use the current game period from the header
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