import { createClient } from '@supabase/supabase-js';

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

    const espnPlays = (data.plays || []).map(play => {
      let periodNumber = null;
      if (play.period?.number && play.period.number > 0) periodNumber = play.period.number;
      if (!periodNumber && play.period?.displayValue) {
        const m = play.period.displayValue.match(/(\d+)/);
        if (m) periodNumber = parseInt(m[1], 10);
      }
      if (!periodNumber && play.text) {
        const m = play.text.match(/(\d+)(?:st|nd|rd|th)\s+inning/i);
        if (m) periodNumber = parseInt(m[1], 10);
      }
      if (!periodNumber && headerPeriod) periodNumber = headerPeriod;
      return {
        id: String(play.id),
        game_id: gameId,
        sport,
        text: play.text || null,
        clock: play.clock?.displayValue || null,
        period: periodNumber,
        period_text: play.period?.displayValue || null,
        team: play.team?.abbreviation || null,
        team_logo: play.team?.logo || null,
        team_color: play.team?.color || null,
        score_value: play.scoreValue || 0,
        scoring_play: play.scoringPlay || false,
        away_score: play.awayScore || 0,
        home_score: play.homeScore || 0,
        type: play.type?.text || null,
      };
    });

    // Try Supabase persistence — wrapped so it never crashes the route
    let plays = espnPlays.map(p => ({
      id: p.id, text: p.text, clock: p.clock, period: p.period,
      periodText: p.period_text, team: p.team, teamLogo: p.team_logo,
      teamColor: p.team_color, scoreValue: p.score_value,
      scoringPlay: p.scoring_play, awayScore: p.away_score,
      homeScore: p.home_score, type: p.type,
    }));

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceKey);
        if (espnPlays.length > 0) {
          await supabaseAdmin.from('game_plays').upsert(espnPlays, { onConflict: 'id,game_id', ignoreDuplicates: false });
        }
        const { data: allPlays } = await supabaseAdmin
          .from('game_plays').select('*').eq('game_id', gameId)
          .order('id', { ascending: false }).limit(500);
        if (allPlays?.length > 0) {
          plays = allPlays.map(p => ({
            id: p.id, text: p.text, clock: p.clock, period: p.period,
            periodText: p.period_text, team: p.team, teamLogo: p.team_logo,
            teamColor: p.team_color, scoreValue: p.score_value,
            scoringPlay: p.scoring_play, awayScore: p.away_score,
            homeScore: p.home_score, type: p.type,
          }));
        }
      }
    } catch (sbErr) {
      // Supabase failed — continue with ESPN plays only
      console.error('Supabase error (non-fatal):', sbErr.message);
    }

    const boxscore = data.boxscore || {};
    const teams = boxscore.teams || [];
    const boxscorePlayers = boxscore.players || [];

    // Build team stats
    let teamStats = teams.map(team => ({
      team: team.team?.abbreviation,
      name: team.team?.displayName,
      logo: team.team?.logo,
      color: team.team?.color,
      homeAway: team.homeAway,
      statistics: (team.statistics || [])
        .filter(s => s.displayValue)
        .map(s => ({
          name: s.name,
          displayValue: s.displayValue,
          label: s.label,
          abbreviation: s.abbreviation,
        })),
    }));

    // MLB: ESPN sends empty statistics — build from players boxscore instead
    if (sport === 'mlb' && teamStats.every(t => t.statistics.length === 0)) {
      teamStats = boxscorePlayers.map(teamPlayers => {
        const battingGroup = teamPlayers.statistics?.find(s => s.name === 'batting');
        const pitchingGroup = teamPlayers.statistics?.find(s => s.name === 'pitching');
        const battingLabels = battingGroup?.labels || [];
        const stats = [];

        ['AB','R','H','RBI','BB','SO','HR'].forEach(stat => {
          const idx = battingLabels.indexOf(stat);
          if (idx === -1) return;
          const total = (battingGroup?.athletes || []).reduce((sum, a) => {
            const v = parseFloat(a.stats?.[idx]);
            return sum + (isNaN(v) ? 0 : v);
          }, 0);
          stats.push({ name: stat, displayValue: String(Math.round(total)), label: stat, abbreviation: stat });
        });

        const pitchingLabels = pitchingGroup?.labels || [];
        [['IP', false], ['K', true], ['ER', true]].forEach(([stat, round]) => {
          const idx = pitchingLabels.indexOf(stat);
          if (idx === -1) return;
          const total = (pitchingGroup?.athletes || []).reduce((sum, a) => {
            const v = parseFloat(a.stats?.[idx]);
            return sum + (isNaN(v) ? 0 : v);
          }, 0);
          stats.push({ name: stat, displayValue: round ? String(Math.round(total)) : total.toFixed(1), label: stat, abbreviation: stat });
        });

        return {
          team: teamPlayers.team?.abbreviation,
          name: teamPlayers.team?.displayName,
          logo: teamPlayers.team?.logo,
          color: teamPlayers.team?.color,
          homeAway: teamPlayers.homeAway,
          statistics: stats,
        };
      });
    }

    const players = boxscorePlayers.map(teamPlayers => ({
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