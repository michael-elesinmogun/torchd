'use client';
import Link from 'next/link';
import { useState } from 'react';
import styles from './communities.module.css';

const LEAGUES = [
  {
    key: 'nba',
    name: 'NBA',
    icon: '🏀',
    desc: 'Basketball debates, live game chat, and the sharpest takes in the league.',
    color: '#C8102E',
    teams: [
      { abbr: 'ATL', name: 'Atlanta Hawks', color: '#E03A3E' },
      { abbr: 'BOS', name: 'Boston Celtics', color: '#007A33' },
      { abbr: 'BKN', name: 'Brooklyn Nets', color: '#000000' },
      { abbr: 'CHA', name: 'Charlotte Hornets', color: '#1D1160' },
      { abbr: 'CHI', name: 'Chicago Bulls', color: '#CE1141' },
      { abbr: 'CLE', name: 'Cleveland Cavaliers', color: '#860038' },
      { abbr: 'DAL', name: 'Dallas Mavericks', color: '#00538C' },
      { abbr: 'DEN', name: 'Denver Nuggets', color: '#0E2240' },
      { abbr: 'DET', name: 'Detroit Pistons', color: '#C8102E' },
      { abbr: 'GSW', name: 'Golden State Warriors', color: '#1D428A' },
      { abbr: 'HOU', name: 'Houston Rockets', color: '#CE1141' },
      { abbr: 'IND', name: 'Indiana Pacers', color: '#002D62' },
      { abbr: 'LAC', name: 'LA Clippers', color: '#C8102E' },
      { abbr: 'LAL', name: 'Los Angeles Lakers', color: '#552583' },
      { abbr: 'MEM', name: 'Memphis Grizzlies', color: '#5D76A9' },
      { abbr: 'MIA', name: 'Miami Heat', color: '#98002E' },
      { abbr: 'MIL', name: 'Milwaukee Bucks', color: '#00471B' },
      { abbr: 'MIN', name: 'Minnesota Timberwolves', color: '#0C2340' },
      { abbr: 'NOP', name: 'New Orleans Pelicans', color: '#0C2340' },
      { abbr: 'NYK', name: 'New York Knicks', color: '#F58426' },
      { abbr: 'OKC', name: 'Oklahoma City Thunder', color: '#007AC1' },
      { abbr: 'ORL', name: 'Orlando Magic', color: '#0077C0' },
      { abbr: 'PHI', name: 'Philadelphia 76ers', color: '#006BB6' },
      { abbr: 'PHX', name: 'Phoenix Suns', color: '#1D1160' },
      { abbr: 'POR', name: 'Portland Trail Blazers', color: '#E03A3E' },
      { abbr: 'SAC', name: 'Sacramento Kings', color: '#5A2D81' },
      { abbr: 'SAS', name: 'San Antonio Spurs', color: '#C4CED4' },
      { abbr: 'TOR', name: 'Toronto Raptors', color: '#CE1141' },
      { abbr: 'UTA', name: 'Utah Jazz', color: '#6B4FBB' },
      { abbr: 'WAS', name: 'Washington Wizards', color: '#002B5C' },
    ],
  },
  {
    key: 'nfl',
    name: 'NFL',
    icon: '🏈',
    desc: 'Football takes, playoff predictions, and debate about the greatest sport.',
    color: '#013369',
    teams: [
      { abbr: 'ARI', name: 'Arizona Cardinals', color: '#97233F' },
      { abbr: 'ATL', name: 'Atlanta Falcons', color: '#A71930' },
      { abbr: 'BAL', name: 'Baltimore Ravens', color: '#241773' },
      { abbr: 'BUF', name: 'Buffalo Bills', color: '#00338D' },
      { abbr: 'CAR', name: 'Carolina Panthers', color: '#0085CA' },
      { abbr: 'CHI', name: 'Chicago Bears', color: '#0B162A' },
      { abbr: 'CIN', name: 'Cincinnati Bengals', color: '#FB4F14' },
      { abbr: 'CLE', name: 'Cleveland Browns', color: '#311D00' },
      { abbr: 'DAL', name: 'Dallas Cowboys', color: '#003594' },
      { abbr: 'DEN', name: 'Denver Broncos', color: '#FB4F14' },
      { abbr: 'DET', name: 'Detroit Lions', color: '#0076B6' },
      { abbr: 'GB', name: 'Green Bay Packers', color: '#203731' },
      { abbr: 'HOU', name: 'Houston Texans', color: '#03202F' },
      { abbr: 'IND', name: 'Indianapolis Colts', color: '#002C5F' },
      { abbr: 'JAX', name: 'Jacksonville Jaguars', color: '#006778' },
      { abbr: 'KC', name: 'Kansas City Chiefs', color: '#E31837' },
      { abbr: 'LAC', name: 'Los Angeles Chargers', color: '#0080C6' },
      { abbr: 'LAR', name: 'Los Angeles Rams', color: '#003594' },
      { abbr: 'LV', name: 'Las Vegas Raiders', color: '#000000' },
      { abbr: 'MIA', name: 'Miami Dolphins', color: '#008E97' },
      { abbr: 'MIN', name: 'Minnesota Vikings', color: '#4F2683' },
      { abbr: 'NE', name: 'New England Patriots', color: '#002244' },
      { abbr: 'NO', name: 'New Orleans Saints', color: '#D3BC8D' },
      { abbr: 'NYG', name: 'New York Giants', color: '#0B2265' },
      { abbr: 'NYJ', name: 'New York Jets', color: '#125740' },
      { abbr: 'PHI', name: 'Philadelphia Eagles', color: '#004C54' },
      { abbr: 'PIT', name: 'Pittsburgh Steelers', color: '#FFB612' },
      { abbr: 'SEA', name: 'Seattle Seahawks', color: '#002244' },
      { abbr: 'SF', name: 'San Francisco 49ers', color: '#AA0000' },
      { abbr: 'TB', name: 'Tampa Bay Buccaneers', color: '#D50A0A' },
      { abbr: 'TEN', name: 'Tennessee Titans', color: '#0C2340' },
      { abbr: 'WSH', name: 'Washington Commanders', color: '#5A1414' },
    ],
  },
  {
    key: 'mlb',
    name: 'MLB',
    icon: '⚾',
    desc: 'Baseball arguments, stats debates, and hot takes on America\'s pastime.',
    color: '#002D72',
    teams: [
      { abbr: 'ARI', name: 'Arizona Diamondbacks', color: '#A71930' },
      { abbr: 'ATL', name: 'Atlanta Braves', color: '#CE1141' },
      { abbr: 'BAL', name: 'Baltimore Orioles', color: '#DF4601' },
      { abbr: 'BOS', name: 'Boston Red Sox', color: '#BD3039' },
      { abbr: 'CHC', name: 'Chicago Cubs', color: '#0E3386' },
      { abbr: 'CWS', name: 'Chicago White Sox', color: '#27251F' },
      { abbr: 'CIN', name: 'Cincinnati Reds', color: '#C6011F' },
      { abbr: 'CLE', name: 'Cleveland Guardians', color: '#E31937' },
      { abbr: 'COL', name: 'Colorado Rockies', color: '#33006F' },
      { abbr: 'DET', name: 'Detroit Tigers', color: '#0C2340' },
      { abbr: 'HOU', name: 'Houston Astros', color: '#EB6E1F' },
      { abbr: 'KC', name: 'Kansas City Royals', color: '#004687' },
      { abbr: 'LAA', name: 'Los Angeles Angels', color: '#BA0021' },
      { abbr: 'LAD', name: 'Los Angeles Dodgers', color: '#005A9C' },
      { abbr: 'MIA', name: 'Miami Marlins', color: '#00685E' },
      { abbr: 'MIL', name: 'Milwaukee Brewers', color: '#12294A' },
      { abbr: 'MIN', name: 'Minnesota Twins', color: '#002B5C' },
      { abbr: 'NYM', name: 'New York Mets', color: '#FF5910' },
      { abbr: 'NYY', name: 'New York Yankees', color: '#003087' },
      { abbr: 'OAK', name: 'Oakland Athletics', color: '#003831' },
      { abbr: 'PHI', name: 'Philadelphia Phillies', color: '#E81828' },
      { abbr: 'PIT', name: 'Pittsburgh Pirates', color: '#FFB612' },
      { abbr: 'SD', name: 'San Diego Padres', color: '#2F241D' },
      { abbr: 'SF', name: 'San Francisco Giants', color: '#FD5A1E' },
      { abbr: 'SEA', name: 'Seattle Mariners', color: '#0C2C56' },
      { abbr: 'STL', name: 'St. Louis Cardinals', color: '#C41E3A' },
      { abbr: 'TB', name: 'Tampa Bay Rays', color: '#092C5C' },
      { abbr: 'TEX', name: 'Texas Rangers', color: '#C0111F' },
      { abbr: 'TOR', name: 'Toronto Blue Jays', color: '#134A8E' },
      { abbr: 'WSH', name: 'Washington Nationals', color: '#AB0003' },
    ],
  },
  {
    key: 'nhl',
    name: 'NHL',
    icon: '🏒',
    desc: 'Hockey debates, trade talk, and the most passionate fans in sports.',
    color: '#000000',
    teams: [
      { abbr: 'ANA', name: 'Anaheim Ducks', color: '#FC4C02' },
      { abbr: 'BOS', name: 'Boston Bruins', color: '#FCB514' },
      { abbr: 'BUF', name: 'Buffalo Sabres', color: '#003087' },
      { abbr: 'CGY', name: 'Calgary Flames', color: '#C8102E' },
      { abbr: 'CAR', name: 'Carolina Hurricanes', color: '#CC0000' },
      { abbr: 'CHI', name: 'Chicago Blackhawks', color: '#CF0A2C' },
      { abbr: 'COL', name: 'Colorado Avalanche', color: '#6F263D' },
      { abbr: 'CBJ', name: 'Columbus Blue Jackets', color: '#002654' },
      { abbr: 'DAL', name: 'Dallas Stars', color: '#006847' },
      { abbr: 'DET', name: 'Detroit Red Wings', color: '#CE1126' },
      { abbr: 'EDM', name: 'Edmonton Oilers', color: '#FC4C02' },
      { abbr: 'FLA', name: 'Florida Panthers', color: '#C8102E' },
      { abbr: 'LAK', name: 'Los Angeles Kings', color: '#111111' },
      { abbr: 'MIN', name: 'Minnesota Wild', color: '#154734' },
      { abbr: 'MTL', name: 'Montreal Canadiens', color: '#AF1E2D' },
      { abbr: 'NSH', name: 'Nashville Predators', color: '#FFD026' },
      { abbr: 'NJD', name: 'New Jersey Devils', color: '#CE1126' },
      { abbr: 'NYI', name: 'New York Islanders', color: '#003087' },
      { abbr: 'NYR', name: 'New York Rangers', color: '#0038A8' },
      { abbr: 'OTT', name: 'Ottawa Senators', color: '#E4173E' },
      { abbr: 'PHI', name: 'Philadelphia Flyers', color: '#F74902' },
      { abbr: 'PIT', name: 'Pittsburgh Penguins', color: '#FFB612' },
      { abbr: 'SEA', name: 'Seattle Kraken', color: '#001628' },
      { abbr: 'SJS', name: 'San Jose Sharks', color: '#006D75' },
      { abbr: 'STL', name: 'St. Louis Blues', color: '#002F87' },
      { abbr: 'TBL', name: 'Tampa Bay Lightning', color: '#002868' },
      { abbr: 'TOR', name: 'Toronto Maple Leafs', color: '#00205B' },
      { abbr: 'VAN', name: 'Vancouver Canucks', color: '#00843D' },
      { abbr: 'VGK', name: 'Vegas Golden Knights', color: '#B4975A' },
      { abbr: 'WSH', name: 'Washington Capitals', color: '#CF0A2C' },
      { abbr: 'WPG', name: 'Winnipeg Jets', color: '#041E42' },
    ],
  },
];

export default function Communities() {
  const [activeLeague, setActiveLeague] = useState('nba');
  const league = LEAGUES.find(l => l.key === activeLeague);

  return (
    <main className={styles.main}>
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.eyebrow}>🔥 Communities</div>
          <h1 className={styles.pageTitle}>Find Your Fanbase</h1>
          <p className={styles.pageSub}>Join your team's community. Debate fans. React to live games.</p>
        </div>

        {/* League tabs */}
        <div className={styles.leagueTabs}>
          {LEAGUES.map(l => (
            <button
              key={l.key}
              className={`${styles.leagueTab} ${activeLeague === l.key ? styles.leagueTabActive : ''}`}
              onClick={() => setActiveLeague(l.key)}
              style={activeLeague === l.key ? { borderColor: l.color, color: l.color, background: `${l.color}15` } : {}}
            >
              <span className={styles.leagueIcon}>{l.icon}</span>
              <span className={styles.leagueName}>{l.name}</span>
            </button>
          ))}
        </div>

        {/* League hero */}
        <div className={styles.leagueHero} style={{ borderColor: `${league.color}40`, background: `${league.color}08` }}>
          <div className={styles.leagueHeroIcon}>{league.icon}</div>
          <div>
            <div className={styles.leagueHeroName}>{league.name} Communities</div>
            <div className={styles.leagueHeroDesc}>{league.desc}</div>
          </div>
        </div>

        {/* Teams grid */}
        <div className={styles.sectionLabel}>All {league.name} Teams</div>
        <div className={styles.teamsGrid}>
          {league.teams.map(team => (
            <Link
              key={team.abbr}
              href={`/communities/${league.key}/${team.abbr.toLowerCase()}`}
              className={styles.teamCard}
              style={{ '--team-color': team.color }}
            >
              <div className={styles.teamCardAccent} style={{ background: team.color }} />
              <div className={styles.teamCardInner}>
                <div className={styles.teamLogo}>
                  <img
                    src={`https://a.espncdn.com/i/teamlogos/${league.key === 'nfl' ? 'nfl' : league.key === 'mlb' ? 'mlb' : league.key === 'nhl' ? 'nhl' : 'nba'}/500/${team.abbr.toLowerCase()}.png`}
                    alt={team.name}
                    className={styles.teamLogoImg}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div className={styles.teamInfo}>
                  <div className={styles.teamAbbr} style={{ color: team.color }}>{team.abbr}</div>
                  <div className={styles.teamName}>{team.name}</div>
                </div>
                <div className={styles.teamArrow}>→</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}