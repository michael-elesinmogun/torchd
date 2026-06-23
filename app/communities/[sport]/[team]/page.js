'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../supabase';
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

const AVATAR_COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#EC4899'];

function getInitials(fullName, username) {
  if (fullName) return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (username || '?').slice(0, 2).toUpperCase();
}

function Avatar({ username, fullName, size = 36, colorIndex = 0 }) {
  const bg = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontFamily: 'Syne, sans-serif', fontWeight: 800,
      color: 'white', flexShrink: 0,
    }}>
      {getInitials(fullName, username)}
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TeamCommunity() {
  const params = useParams();
  const sport = params?.sport;
  const teamAbbr = params?.team?.toUpperCase();

  const teamInfo = TEAM_DATA[sport]?.[teamAbbr];
  const teamColor = teamInfo?.color || '#3B82F6';
  const logoUrl = `https://a.espncdn.com/i/teamlogos/${sport}/500/${teamAbbr?.toLowerCase()}.png`;

  const [activeTab, setActiveTab] = useState('chat');
  const [fans, setFans] = useState([]);
  const [battles, setBattles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!sport || !teamAbbr) return;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser);

      // Load current user profile for avatar/chat
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url, community_teams')
          .eq('id', currentUser.id)
          .single();
        setUserProfile(profile);
        if (profile?.community_teams) {
          const teams = JSON.parse(profile.community_teams || '[]');
          setIsMember(teams.includes(`${sport}-${teamAbbr}`));
        }
      }

      // Load member count (profiles who joined this team community)
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .ilike('community_teams', `%${sport}-${teamAbbr}%`);
      setMemberCount(count || 0);

      // Load fans (top by wins who are members)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('username, full_name, wins, battles_count, avatar_url')
        .ilike('community_teams', `%${sport}-${teamAbbr}%`)
        .order('wins', { ascending: false })
        .limit(50);
      setFans(profiles || []);

      // Load recent battles
      const { data: battleData } = await supabase
        .from('battles')
        .select('*')
        .eq('status', 'ended')
        .order('ended_at', { ascending: false })
        .limit(20);
      setBattles(battleData || []);

      // Load recent chat messages (newest first)
      const { data: chatData } = await supabase
        .from('community_chats')
        .select('*')
        .eq('sport', sport)
        .eq('team_abbr', teamAbbr)
        .order('created_at', { ascending: false })
        .limit(60);
      setMessages(chatData || []);

      setLoading(false);
    }

    load();

    // Realtime chat subscription
    const channel = supabase
      .channel(`community-chat-${sport}-${teamAbbr}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_chats',
        filter: `sport=eq.${sport}`,
      }, (payload) => {
        if (payload.new.team_abbr === teamAbbr) {
          setMessages(prev => [payload.new, ...prev]);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [sport, teamAbbr]);

  async function sendMessage() {
    if (!msgInput.trim() || !user || sending) return;
    setSending(true);
    const text = msgInput.trim();
    setMsgInput('');
    await supabase.from('community_chats').insert({
      sport,
      team_abbr: teamAbbr,
      user_id: user.id,
      username: userProfile?.username || user.email?.split('@')[0],
      message: text,
    });
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function toggleMembership() {
    if (!user) return;
    setJoining(true);
    const { data: profile } = await supabase.from('profiles').select('community_teams').eq('id', user.id).single();
    const existing = JSON.parse(profile?.community_teams || '[]');
    const key = `${sport}-${teamAbbr}`;
    const updated = existing.includes(key) ? existing.filter(t => t !== key) : [...existing, key];
    await supabase.from('profiles').update({ community_teams: JSON.stringify(updated) }).eq('id', user.id);
    const joined = !isMember;
    setIsMember(joined);
    setMemberCount(c => joined ? c + 1 : c - 1);
    setJoining(false);
  }

  if (!teamInfo) {
    return (
      <main className={styles.main}>
        <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-muted)' }}>
          Team not found. <Link href="/communities" style={{ color: '#3B82F6' }}>Back to Communities</Link>
        </div>
      </main>
    );
  }

  const tabs = [
    { key: 'chat', label: '💬 Chat' },
    { key: 'debates', label: '⚔️ Debates' },
    { key: 'fans', label: '👥 Fans' },
  ];

  return (
    <main className={styles.main}>

      {/* Hero */}
      <div className={styles.hero} style={{ '--team-color': teamColor }}>
        <div className={styles.heroGlow} style={{ background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${teamColor}28 0%, transparent 70%)` }} />
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <div className={styles.logoWrap} style={{ boxShadow: `0 0 0 2px ${teamColor}40, 0 8px 32px ${teamColor}30` }}>
              <img src={logoUrl} alt={teamInfo.name} className={styles.heroLogo} onError={e => e.target.style.display = 'none'} />
            </div>
            <div>
              <div className={styles.heroLeague}>{sport.toUpperCase()} Community</div>
              <h1 className={styles.heroName}>{teamInfo.name}</h1>
              <div className={styles.heroMeta}>
                <span className={styles.memberPip} style={{ background: teamColor }} />
                <span style={{ color: teamColor, fontWeight: 700 }}>{memberCount.toLocaleString()}</span>
                <span style={{ color: 'var(--text-muted)' }}> members</span>
              </div>
            </div>
          </div>
          <div className={styles.heroActions}>
            {user ? (
              <button
                onClick={toggleMembership}
                className={styles.joinBtn}
                style={isMember
                  ? { background: `${teamColor}18`, border: `1.5px solid ${teamColor}`, color: teamColor }
                  : { background: teamColor, border: `1.5px solid ${teamColor}`, color: '#fff' }
                }
                disabled={joining}
              >
                {joining ? '...' : isMember ? '✓ Joined' : '+ Join'}
              </button>
            ) : (
              <Link href="/login" className={styles.joinBtn} style={{ background: teamColor, color: '#fff', border: `1.5px solid ${teamColor}` }}>
                Join Community
              </Link>
            )}
            <Link href="/communities" className={styles.backLink}>← Communities</Link>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabRow}>
          <div className={styles.tabs}>
            {tabs.map(t => (
              <button
                key={t.key}
                className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
                style={activeTab === t.key ? { color: teamColor, borderColor: teamColor } : {}}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : activeTab === 'chat' ? (

          /* ── CHAT TAB ── */
          <div className={styles.chatWrap}>
            <div className={styles.chatFeed}>
              {messages.length === 0 ? (
                <div className={styles.chatEmpty}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
                  <div className={styles.emptyTitle}>No messages yet</div>
                  <p className={styles.emptySub}>Be the first to say something about the {teamInfo.name}.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOwn = msg.user_id === user?.id;
                  const colorIdx = msg.username?.charCodeAt(0) % AVATAR_COLORS.length;
                  return (
                    <div key={msg.id} className={`${styles.msgRow} ${isOwn ? styles.msgOwn : ''}`}>
                      {!isOwn && (
                        <Avatar username={msg.username} size={32} colorIndex={colorIdx} />
                      )}
                      <div className={styles.msgBubbleWrap}>
                        {!isOwn && (
                          <div className={styles.msgMeta}>
                            <Link href={`/profile/${msg.username}`} className={styles.msgUsername}>
                              @{msg.username}
                            </Link>
                            <span className={styles.msgTime}>{timeAgo(msg.created_at)}</span>
                          </div>
                        )}
                        <div
                          className={styles.msgBubble}
                          style={isOwn ? { background: `${teamColor}CC`, color: '#fff' } : {}}
                        >
                          {msg.message}
                        </div>
                        {isOwn && (
                          <div className={styles.msgTime} style={{ textAlign: 'right', marginTop: 3 }}>
                            {timeAgo(msg.created_at)}
                          </div>
                        )}
                      </div>
                      {isOwn && (
                        <Avatar username={userProfile?.username} fullName={userProfile?.full_name} size={32} colorIndex={colorIdx} />
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className={styles.chatInputRow} style={{ borderTop: `1px solid ${teamColor}25` }}>
              {user ? (
                <>
                  <Avatar username={userProfile?.username} fullName={userProfile?.full_name} size={32} colorIndex={0} />
                  <input
                    ref={inputRef}
                    className={styles.chatInput}
                    placeholder={`Message ${teamInfo.name} fans...`}
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={300}
                  />
                  <button
                    className={styles.sendBtn}
                    style={{ background: msgInput.trim() ? teamColor : 'var(--bg-tertiary)', color: msgInput.trim() ? '#fff' : 'var(--text-faint)' }}
                    onClick={sendMessage}
                    disabled={!msgInput.trim() || sending}
                  >
                    ↑
                  </button>
                </>
              ) : (
                <div className={styles.chatSignIn}>
                  <Link href="/login" style={{ color: teamColor, fontWeight: 700 }}>Sign in</Link>
                  <span style={{ color: 'var(--text-muted)' }}> to join the conversation</span>
                </div>
              )}
            </div>
          </div>

        ) : activeTab === 'debates' ? (

          /* ── DEBATES TAB ── */
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>Recent Debates</div>
              <Link href="/battle" className={styles.actionBtn} style={{ background: teamColor }}>+ Start Debate</Link>
            </div>
            {battles.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>⚔️</div>
                <div className={styles.emptyTitle}>No debates yet</div>
                <p className={styles.emptySub}>Be the first to debate about the {teamInfo.name}.</p>
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

          /* ── FANS TAB ── */
          <div className={styles.section}>
            <div className={styles.sectionTitle} style={{ marginBottom: '1.25rem' }}>Top Fans</div>
            {fans.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>👥</div>
                <div className={styles.emptyTitle}>No fans yet</div>
                <p className={styles.emptySub}>Join this community to appear here.</p>
              </div>
            ) : (
              <div className={styles.fanList}>
                {fans.map((fan, i) => (
                  <Link key={fan.username} href={`/profile/${fan.username}`} className={styles.fanCard}>
                    <div className={styles.fanRank} style={{ color: i < 3 ? teamColor : 'var(--text-faint)' }}>#{i + 1}</div>
                    <Avatar username={fan.username} fullName={fan.full_name} size={36} colorIndex={i} />
                    <div className={styles.fanInfo}>
                      <div className={styles.fanName}>{fan.full_name || fan.username}</div>
                      <div className={styles.fanHandle}>@{fan.username}</div>
                    </div>
                    <div className={styles.fanStats}>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>{fan.wins || 0}W</span>
                      <span style={{ color: 'var(--text-faint)', fontSize: '11px' }}>{fan.battles_count || 0} battles</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}