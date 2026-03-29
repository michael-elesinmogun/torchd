'use client';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import styles from './lobby.module.css';

const SPORTS = [
  { key: 'nba', label: 'NBA', icon: '🏀' },
  { key: 'nfl', label: 'NFL', icon: '🏈' },
  { key: 'mlb', label: 'MLB', icon: '⚾' },
  { key: 'nhl', label: 'NHL', icon: '🏒' },
];

function getStatusColor(type) {
  if (type === 'STATUS_IN_PROGRESS') return '#EF4444';
  if (type === 'STATUS_FINAL') return '#6B7A9E';
  return '#3B82F6';
}

function getStatusLabel(status) {
  if (status.type === 'STATUS_IN_PROGRESS') return status.detail || status.clock || 'LIVE';
  if (status.type === 'STATUS_FINAL') return 'Final';
  if (status.type === 'STATUS_SCHEDULED') {
    const date = new Date(status.detail || '');
    return isNaN(date) ? 'Upcoming' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return status.description || 'Upcoming';
}

function isLive(status) {
  return status.type === 'STATUS_IN_PROGRESS';
}

function isFinal(status) {
  return status.type === 'STATUS_FINAL';
}

export default function Lobby() {
  const [activeSport, setActiveSport] = useState('nba');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchGames = useCallback(async (sport) => {
    try {
      const res = await fetch(`/api/scores?sport=${sport}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGames(data.games || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Could not load scores. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setGames([]);
    fetchGames(activeSport);

    // Refresh every 30 seconds
    const interval = setInterval(() => fetchGames(activeSport), 30000);
    return () => clearInterval(interval);
  }, [activeSport, fetchGames]);

  const liveGames = games.filter(g => isLive(g.status));
  const finalGames = games.filter(g => isFinal(g.status));
  const upcomingGames = games.filter(g => !isLive(g.status) && !isFinal(g.status));

  return (
    <main className={styles.main}>
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>
              {liveGames.length > 0 && <><span className={styles.liveDot}></span> {liveGames.length} game{liveGames.length !== 1 ? 's' : ''} live</>}
              {liveGames.length === 0 && 'Game Lobby'}
            </div>
            <h1 className={styles.pageTitle}>Game Lobby</h1>
            {lastUpdated && (
              <div className={styles.updatedAt}>
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
          </div>
          <Link href="/battle/start" className={styles.startBattleBtn}>
            ⚔️ Start a Battle
          </Link>
        </div>

        {/* Sport tabs */}
        <div className={styles.sportTabs}>
          {SPORTS.map(s => (
            <button
              key={s.key}
              className={`${styles.sportTab} ${activeSport === s.key ? styles.sportTabActive : ''}`}
              onClick={() => setActiveSport(s.key)}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <div>Loading {SPORTS.find(s => s.key === activeSport)?.label} scores...</div>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <div>⚠️ {error}</div>
            <button className={styles.retryBtn} onClick={() => fetchGames(activeSport)}>Try again</button>
          </div>
        ) : games.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📅</div>
            <div className={styles.emptyTitle}>No {SPORTS.find(s => s.key === activeSport)?.label} games today</div>
            <p className={styles.emptySub}>Check back later or switch to another sport.</p>
          </div>
        ) : (
          <div className={styles.gamesWrap}>

            {/* Live games */}
            {liveGames.length > 0 && (
              <div className={styles.gameGroup}>
                <div className={styles.groupLabel}>
                  <span className={styles.liveDot}></span> Live now
                </div>
                <div className={styles.gameGrid}>
                  {liveGames.map(game => (
                    <GameCard key={game.id} game={game} sport={activeSport} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming games */}
            {upcomingGames.length > 0 && (
              <div className={styles.gameGroup}>
                <div className={styles.groupLabel}>Upcoming</div>
                <div className={styles.gameGrid}>
                  {upcomingGames.map(game => (
                    <GameCard key={game.id} game={game} sport={activeSport} />
                  ))}
                </div>
              </div>
            )}

            {/* Final games */}
            {finalGames.length > 0 && (
              <div className={styles.gameGroup}>
                <div className={styles.groupLabel}>Final</div>
                <div className={styles.gameGrid}>
                  {finalGames.map(game => (
                    <GameCard key={game.id} game={game} sport={activeSport} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}

function GameCard({ game, sport }) {
  const live = isLive(game.status);
  const final = isFinal(game.status);
  const statusLabel = getStatusLabel(game.status);
  const statusColor = getStatusColor(game.status.type);

  return (
    <div className={`${styles.gameCard} ${live ? styles.gameCardLive : ''}`}>

      {/* Status */}
      <div className={styles.gameCardTop}>
        <div className={styles.gameStatus} style={{ color: statusColor }}>
          {live && <span className={styles.liveDotSmall}></span>}
          {statusLabel}
        </div>
        {game.broadcast && (
          <div className={styles.gameBroadcast}>{game.broadcast}</div>
        )}
      </div>

      {/* Teams & Score */}
      <div className={styles.gameTeams}>
        <div className={styles.teamRow}>
          {game.away.logo && <img src={game.away.logo} alt={game.away.abbr} className={styles.teamLogo} />}
          <div className={styles.teamInfo}>
            <div className={styles.teamAbbr}>{game.away.abbr}</div>
            {game.away.record && <div className={styles.teamRecord}>{game.away.record}</div>}
          </div>
          {(live || final) && (
            <div className={`${styles.teamScore} ${game.away.score > game.home.score ? styles.scoreLeading : ''}`}>
              {game.away.score ?? '—'}
            </div>
          )}
        </div>

        <div className={styles.teamRow}>
          {game.home.logo && <img src={game.home.logo} alt={game.home.abbr} className={styles.teamLogo} />}
          <div className={styles.teamInfo}>
            <div className={styles.teamAbbr}>{game.home.abbr}</div>
            {game.home.record && <div className={styles.teamRecord}>{game.home.record}</div>}
          </div>
          {(live || final) && (
            <div className={`${styles.teamScore} ${game.home.score > game.away.score ? styles.scoreLeading : ''}`}>
              {game.home.score ?? '—'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.gameCardBottom}>
        {game.venue && <div className={styles.gameVenue}>{game.venue}</div>}
        <Link
          href={`/battle/start`}
          className={styles.debateBtn}
        >
          ⚔️ Debate this game
        </Link>
      </div>

    </div>
  );
}