'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../supabase';
import styles from './team.module.css';

const TEAM_DATA = {
  nba: {
    ATL: { name: 'Atlanta Hawks', color: '#E03A3E' },
    BOS: { name: 'Boston Celtics', color: '#007A33' },
    BKN: { name: 'Brooklyn Nets', color: '#000000' },
    CHA: { name: 'Charlotte Hornets', color: '#1D1160' },
    CHI: { name: 'Chicago Bulls', color: '#CE1141' },
    CLE: { name: 'Cleveland Cavaliers', color: '#860038' },
    DAL: { name: 'Dallas Mavericks', color: '#00538C' },
    DEN: { name: 'Denver Nuggets', color: '#0E2240' },
    DET: { name: 'Detroit Pistons', color: '#C8102E' },
    GSW: { name: 'Golden State Warriors', color: '#1D428A' },
    HOU: { name: 'Houston Rockets', color: '#CE1141' },
    IND: { name: 'Indiana Pacers', color: '#002D62' },
    LAC: { name: 'LA Clippers', color: '#C8102E' },
    LAL: { name: 'Los Angeles Lakers', color: '#552583' },
    MEM: { name: 'Memphis Grizzlies', color: '#5D76A9' },
    MIA: { name: 'Miami Heat', color: '#98002E' },
    MIL: { name: 'Milwaukee Bucks', color: '#00471B' },
    MIN: { name: 'Minnesota Timberwolves', color: '#0C2340' },
    NOP: { name: 'New Orleans Pelicans', color: '#0C2340' },
    NYK: { name: 'New York Knicks', color: '#F58426' },
    OKC: { name: 'Oklahoma City Thunder', color: '#007AC1' },
    ORL: { name: 'Orlando Magic', color: '#0077C0' },
    PHI: { name: 'Philadelphia 76ers', color: '#006BB6' },
    PHX: { name: 'Phoenix Suns', color: '#1D1160' },
    POR: { name: 'Portland Trail Blazers', color: '#E03A3E' },
    SAC: { name: 'Sacramento Kings', color: '#5A2D81' },
    SAS: { name: 'San Antonio Spurs', color: '#C4CED4' },
    TOR: { name: 'Toronto Raptors', color: '#CE1141' },
    UTA: { name: 'Utah Jazz', color: '#6B4FBB' },
    WAS: { name: 'Washington Wizards', color: '#002B5C' },
  },
  nfl: {
    ARI: { name: 'Arizona Cardinals', color: '#97233F' },
    ATL: { name: 'Atlanta Falcons', color: '#A71930' },
    BAL: { name: 'Baltimore Ravens', color: '#241773' },
    BUF: { name: 'Buffalo Bills', color: '#00338D' },
    CAR: { name: 'Carolina Panthers', color: '#0085CA' },
    CHI: { name: 'Chicago Bears', color: '#0B162A' },
    CIN: { name: 'Cincinnati Bengals', color: '#FB4F14' },
    CLE: { name: 'Cleveland Browns', color: '#311D00' },
    DAL: { name: 'Dallas Cowboys', color: '#003594' },
    DEN: { name: 'Denver Broncos', color: '#FB4F14' },
    DET: { name: 'Detroit Lions', color: '#0076B6' },
    GB: { name: 'Green Bay Packers', color: '#203731' },
    HOU: { name: 'Houston Texans', color: '#03202F' },
    IND: { name: 'Indianapolis Colts', color: '#002C5F' },
    JAX: { name: 'Jacksonville Jaguars', color: '#006778' },
    KC: { name: 'Kansas City Chiefs', color: '#E31837' },
    LAC: { name: 'Los Angeles Chargers', color: '#0080C6' },
    LAR: { name: 'Los Angeles Rams', color: '#003594' },
    LV: { name: 'Las Vegas Raiders', color: '#000000' },
    MIA: { name: 'Miami Dolphins', color: '#008E97' },
    MIN: { name: 'Minnesota Vikings', color: '#4F2683' },
    NE: { name: 'New England Patriots', color: '#002244' },
    NO: { name: 'New Orleans Saints', color: '#D3BC8D' },
    NYG: { name: 'New York Giants', color: '#0B2265' },
    NYJ: { name: 'New York Jets', color: '#125740' },
    PHI: { name: 'Philadelphia Eagles', color: '#004C54' },
    PIT: { name: 'Pittsburgh Steelers', color: '#FFB612' },
    SEA: { name: 'Seattle Seahawks', color: '#002244' },
    SF: { name: 'San Francisco 49ers', color: '#AA0000' },
    TB: { name: 'Tampa Bay Buccaneers', color: '#D50A0A' },
    TEN: { name: 'Tennessee Titans', color: '#0C2340' },
    WSH: { name: 'Washington Commanders', color: '#5A1414' },
  },
  mlb: {
    ARI: { name: 'Arizona Diamondbacks', color: '#A71930' },
    ATL: { name: 'Atlanta Braves', color: '#CE1141' },
    BAL: { name: 'Baltimore Orioles', color: '#DF4601' },
    BOS: { name: 'Boston Red Sox', color: '#BD3039' },
    CHC: { name: 'Chicago Cubs', color: '#0E3386' },
    CWS: { name: 'Chicago White Sox', color: '#27251F' },
    CIN: { name: 'Cincinnati Reds', color: '#C6011F' },
    CLE: { name: 'Cleveland Guardians', color: '#E31937' },
    COL: { name: 'Colorado Rockies', color: '#33006F' },
    DET: { name: 'Detroit Tigers', color: '#0C2340' },
    HOU: { name: 'Houston Astros', color: '#EB6E1F' },
    KC: { name: 'Kansas City Royals', color: '#004687' },
    LAA: { name: 'Los Angeles Angels', color: '#BA0021' },
    LAD: { name: 'Los Angeles Dodgers', color: '#005A9C' },
    MIA: { name: 'Miami Marlins', color: '#00685E' },
    MIL: { name: 'Milwaukee Brewers', color: '#12294A' },
    MIN: { name: 'Minnesota Twins', color: '#002B5C' },
    NYM: { name: 'New York Mets', color: '#FF5910' },
    NYY: { name: 'New York Yankees', color: '#003087' },
    OAK: { name: 'Oakland Athletics', color: '#003831' },
    PHI: { name: 'Philadelphia Phillies', color: '#E81828' },
    PIT: { name: 'Pittsburgh Pirates', color: '#FFB612' },
    SD: { name: 'San Diego Padres', color: '#2F241D' },
    SF: { name: 'San Francisco Giants', color: '#FD5A1E' },
    SEA: { name: 'Seattle Mariners', color: '#0C2C56' },
    STL: { name: 'St. Louis Cardinals', color: '#C41E3A' },
    TB: { name: 'Tampa Bay Rays', color: '#092C5C' },
    TEX: { name: 'Texas Rangers', color: '#C0111F' },
    TOR: { name: 'Toronto Blue Jays', color: '#134A8E' },
    WSH: { name: 'Washington Nationals', color: '#AB0003' },
  },
  nhl: {
    ANA: { name: 'Anaheim Ducks', color: '#FC4C02' },
    BOS: { name: 'Boston Bruins', color: '#FCB514' },
    BUF: { name: 'Buffalo Sabres', color: '#003087' },
    CGY: { name: 'Calgary Flames', color: '#C8102E' },
    CAR: { name: 'Carolina Hurricanes', color: '#CC0000' },
    CHI: { name: 'Chicago Blackhawks', color: '#CF0A2C' },
    COL: { name: 'Colorado Avalanche', color: '#6F263D' },
    CBJ: { name: 'Columbus Blue Jackets', color: '#002654' },
    DAL: { name: 'Dallas Stars', color: '#006847' },
    DET: { name: 'Detroit Red Wings', color: '#CE1126' },
    EDM: { name: 'Edmonton Oilers', color: '#FC4C02' },
    FLA: { name: 'Florida Panthers', color: '#C8102E' },
    LAK: { name: 'Los Angeles Kings', color: '#111111' },
    MIN: { name: 'Minnesota Wild', color: '#154734' },
    MTL: { name: 'Montreal Canadiens', color: '#AF1E2D' },
    NSH: { name: 'Nashville Predators', color: '#FFD026' },
    NJD: { name: 'New Jersey Devils', color: '#CE1126' },
    NYI: { name: 'New York Islanders', color: '#003087' },
    NYR: { name: 'New York Rangers', color: '#0038A8' },
    OTT: { name: 'Ottawa Senators', color: '#E4173E' },
    PHI: { name: 'Philadelphia Flyers', color: '#F74902' },
    PIT: { name: 'Pittsburgh Penguins', color: '#FFB612' },
    SEA: { name: 'Seattle Kraken', color: '#001628' },
    SJS: { name: 'San Jose Sharks', color: '#006D75' },
    STL: { name: 'St. Louis Blues', color: '#002F87' },
    TBL: { name: 'Tampa Bay Lightning', color: '#002868' },
    TOR: { name: 'Toronto Maple Leafs', color: '#00205B' },
    VAN: { name: 'Vancouver Canucks', color: '#00843D' },
    VGK: { name: 'Vegas Golden Knights', color: '#B4975A' },
    WSH: { name: 'Washington Capitals', color: '#CF0A2C' },
    WPG: { name: 'Winnipeg Jets', color: '#041E42' },
  },
};

export default function TeamCommunity() {
  const params = useParams();
  const sport = params?.sport;
  const teamAbbr = params?.team?.toUpperCase();

  const teamInfo = TEAM_DATA[sport]?.[teamAbbr];
  const teamColor = teamInfo?.color || '#3B82F6';
  const logoUrl = `https://a.espncdn.com/i/teamlogos/${sport}/500/${teamAbbr?.toLowerCase()}.png`;

  const [activeTab, setActiveTab] = useState('debates');
  const [fans, setFans] = useState([]);
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser);

      // Load fans who follow this team
      const { data: profiles } = await supabase
        .from('profiles')
        .select('username, full_name, wins, battles_count, avatar_url')
        .ilike('sport', sport === 'nba' ? 'nba' : sport === 'nfl' ? 'nfl' : sport === 'mlb' ? 'mlb' : 'nhl')
        .order('wins', { ascending: false })
        .limit(50);
      setFans(profiles || []);
      setMemberCount(profiles?.length || 0);

      // Check if current user is a member
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sport, community_teams')
          .eq('id', currentUser.id)
          .single();
        if (profile?.community_teams) {
          const teams = JSON.parse(profile.community_teams || '[]');
          setIsMember(teams.includes(`${sport}-${teamAbbr}`));
        }
      }

      // Load recent battles mentioning this team
      const { data: battleData } = await supabase
        .from('battles')
        .select('*')
        .eq('status', 'ended')
        .order('ended_at', { ascending: false })
        .limit(20);
      setBattles(battleData || []);

      setLoading(false);
    }
    load();
  }, [sport, teamAbbr]);

  async function toggleMembership() {
    if (!user) return;
    setJoining(true);
    const { data: profile } = await supabase.from('profiles').select('community_teams').eq('id', user.id).single();
    const existing = JSON.parse(profile?.community_teams || '[]');
    const key = `${sport}-${teamAbbr}`;
    const updated = existing.includes(key) ? existing.filter(t => t !== key) : [...existing, key];
    await supabase.from('profiles').update({ community_teams: JSON.stringify(updated) }).eq('id', user.id);
    setIsMember(!isMember);
    setMemberCount(c => isMember ? c - 1 : c + 1);
    setJoining(false);
  }

  const AVATAR_COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#EC4899'];

  if (!teamInfo) {
    return (
      <main className={styles.main}>
        <div className={styles.page}>
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Team not found. <Link href="/communities" style={{ color: '#3B82F6' }}>Back to Communities</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>

      {/* Team hero banner */}
      <div className={styles.heroBanner} style={{ borderBottom: `3px solid ${teamColor}` }}>
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <img src={logoUrl} alt={teamInfo.name} className={styles.heroLogo} onError={e => e.target.style.display='none'} />
            <div>
              <div className={styles.heroLeague}>{sport.toUpperCase()} Community</div>
              <h1 className={styles.heroName}>{teamInfo.name}</h1>
              <div className={styles.heroStats}>
                <span style={{ color: teamColor, fontWeight: 700 }}>{memberCount}</span> fans
              </div>
            </div>
          </div>
          <div className={styles.heroRight}>
            {user ? (
              <button
                onClick={toggleMembership}
                className={styles.joinBtn}
                style={isMember ? { background: `${teamColor}20`, border: `1px solid ${teamColor}`, color: teamColor } : { background: teamColor }}
                disabled={joining}
              >
                {joining ? '...' : isMember ? '✓ Joined' : '+ Join Community'}
              </button>
            ) : (
              <Link href="/login" className={styles.joinBtn} style={{ background: teamColor }}>Sign in to join</Link>
            )}
            <Link href="/communities" className={styles.backLink}>← All Communities</Link>
          </div>
        </div>
      </div>

      <div className={styles.page}>

        {/* Tabs */}
        <div className={styles.tabs}>
          {[
            { key: 'debates', label: '⚔️ Debates' },
            { key: 'fans', label: '👥 Fans' },
          ].map(t => (
            <button
              key={t.key}
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
              style={activeTab === t.key ? { borderColor: teamColor, color: teamColor } : {}}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : activeTab === 'debates' ? (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>Recent Debates</div>
              <Link href="/battle" className={styles.newDebateBtn} style={{ background: teamColor }}>+ Start a Debate</Link>
            </div>
            {battles.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>⚔️</div>
                <div className={styles.emptyTitle}>No debates yet</div>
                <p className={styles.emptySub}>Be the first to start a debate about the {teamInfo.name}.</p>
                <Link href="/battle" className={styles.emptyBtn} style={{ background: teamColor }}>Start a debate →</Link>
              </div>
            ) : (
              <div className={styles.battleList}>
                {battles.map(battle => (
                  <Link key={battle.id} href={`/battle/room/${battle.id}`} className={styles.battleCard}>
                    <div className={styles.battleTopic}>"{battle.topic}"</div>
                    <div className={styles.battleMeta}>
                      <span style={{ color: '#60A5FA' }}>@{battle.player1_username}</span>
                      <span style={{ color: 'var(--text-faint)' }}> vs </span>
                      <span style={{ color: '#60A5FA' }}>@{battle.player2_username}</span>
                    </div>
                    <div className={styles.battleDate}>
                      {new Date(battle.ended_at || battle.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Top Fans</div>
            {fans.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>👥</div>
                <div className={styles.emptyTitle}>No fans yet</div>
                <p className={styles.emptySub}>Be the first fan in this community.</p>
              </div>
            ) : (
              <div className={styles.fanList}>
                {fans.map((fan, i) => {
                  const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  const initials = fan.full_name
                    ? fan.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
                    : fan.username?.slice(0,2).toUpperCase();
                  return (
                    <Link key={fan.username} href={`/profile/${fan.username}`} className={styles.fanCard}>
                      <div className={styles.fanRank} style={{ color: i < 3 ? teamColor : 'var(--text-faint)' }}>#{i+1}</div>
                      <div className={styles.fanAvatar} style={{ background: bg }}>{initials}</div>
                      <div className={styles.fanInfo}>
                        <div className={styles.fanName}>{fan.full_name || fan.username}</div>
                        <div className={styles.fanHandle}>@{fan.username}</div>
                      </div>
                      <div className={styles.fanStats}>
                        <span style={{ color: '#10B981', fontWeight: 700 }}>{fan.wins || 0}W</span>
                        <span style={{ color: 'var(--text-faint)', fontSize: '11px' }}>{fan.battles_count || 0} battles</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}