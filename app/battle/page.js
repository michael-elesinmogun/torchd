'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabase';
import styles from './start.module.css';

const TOPICS = [
  { tag: 'NBA', text: 'LeBron James is the greatest basketball player of all time' },
  { tag: 'NFL', text: 'Patrick Mahomes has already surpassed Tom Brady as the GOAT QB' },
  { tag: 'NBA', text: 'The Boston Celtics are building a legitimate dynasty' },
  { tag: 'NBA', text: 'Steph Curry changed basketball more than any player in 30 years' },
  { tag: 'NFL', text: 'Lamar Jackson is the best QB in football right now' },
  { tag: 'NBA', text: 'Wembanyama will be better than LeBron by age 25' },
  { tag: 'NFL', text: 'The NFL needs an 18-game season' },
  { tag: 'Soccer', text: 'Messi is the greatest footballer of all time' },
  { tag: 'NBA', text: 'The Warriors dynasty is officially over' },
  { tag: 'NFL', text: 'Defensive players should be eligible for MVP' },
];

const SEEK_DURATION = 10 * 60;

export default function StartBattle() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [customTopic, setCustomTopic] = useState('');
  const [stance, setStance] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdBattle, setCreatedBattle] = useState(null);

  const [seekTimeLeft, setSeekTimeLeft] = useState(SEEK_DURATION);
  const [battleAccepted, setBattleAccepted] = useState(false);
  const [acceptedBy, setAcceptedBy] = useState('');
  const [seekExpired, setSeekExpired] = useState(false);

  const seekTimerRef = useRef(null);
  const pollRef = useRef(null);
  const expiresAtRef = useRef(null);
  const createdBattleRef = useRef(null);
  const profileLoadedRef = useRef(false);

  async function loadProfile(currentUser) {
    if (profileLoadedRef.current) return;
    profileLoadedRef.current = true;
    setProfileLoading(true);

    const { data: profileData } = await supabase
      .from('profiles').select('username, full_name').eq('id', currentUser.id).maybeSingle();

    if (profileData?.username) {
      setProfile(profileData);
    } else {
      const fullName = currentUser.user_metadata?.full_name || '';
      const email = currentUser.email || '';
      const fallbackUsername = fullName ? fullName.toLowerCase().replace(/\s+/g, '') : email.split('@')[0];
      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({ id: currentUser.id, username: fallbackUsername, full_name: fullName }, { onConflict: 'id' })
        .select().maybeSingle();
      if (newProfile) setProfile(newProfile);
      else setError('Could not load your profile. Please go to Settings and set a username.');
    }
    setProfileLoading(false);
  }

  useEffect(() => {
    // onAuthStateChange fires faster than getSession on refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) return; // Don't redirect immediately — let getSession handle it
      setUser(session.user);
      loadProfile(session.user);
    });

    // getSession as the authoritative check — redirects if truly not logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      loadProfile(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (step !== 3 || !createdBattle) return;

    createdBattleRef.current = createdBattle;
    expiresAtRef.current = new Date(createdBattle.expires_at).getTime();

    function tick() {
      const left = Math.max(0, Math.floor((expiresAtRef.current - Date.now()) / 1000));
      setSeekTimeLeft(left);
      if (left <= 0) {
        clearInterval(seekTimerRef.current);
        supabase.from('battles').update({ status: 'expired' }).eq('id', createdBattleRef.current.id);
        setSeekExpired(true);
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') tick();
    }

    tick();
    seekTimerRef.current = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', handleVisibility);

    const channel = supabase
      .channel(`seeking-watch-${createdBattle.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'battles',
        filter: `id=eq.${createdBattle.id}`,
      }, (payload) => {
        if (payload.new.status === 'live') {
          clearInterval(seekTimerRef.current);
          clearInterval(pollRef.current);
          setBattleAccepted(true);
          setAcceptedBy(payload.new.player2_username || '');
          setTimeout(() => router.push(`/battle/room/${createdBattle.id}`), 2500);
        }
      })
      .subscribe();

    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('battles').select('status, player2_username')
        .eq('id', createdBattleRef.current.id).maybeSingle();
      if (data?.status === 'live') {
        clearInterval(seekTimerRef.current);
        clearInterval(pollRef.current);
        setBattleAccepted(true);
        setAcceptedBy(data.player2_username || '');
        setTimeout(() => router.push(`/battle/room/${createdBattle.id}`), 2500);
      }
    }, 5000);

    return () => {
      clearInterval(seekTimerRef.current);
      clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [step, createdBattle]);

  const topic = selectedTopic === 'custom' ? customTopic : selectedTopic?.text || '';

  async function createBattle() {
    if (!topic.trim() || !stance) return;

    // If profile still loading, wait a moment and try again
    if (profileLoading) {
      setError('Profile still loading, please wait a second and try again.');
      return;
    }

    if (!profile?.username) {
      setError('Profile not found. Please go to Settings and set a username.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const expiresAt = new Date(Date.now() + SEEK_DURATION * 1000).toISOString();

      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .insert({
          topic: topic.trim(),
          player1_username: profile.username,
          player1_stance: stance === 'for'
            ? `FOR — ${topic.trim().slice(0, 40)}`
            : `AGAINST — ${topic.trim().slice(0, 40)}`,
          status: 'seeking',
          expires_at: expiresAt,
        })
        .select().single();

      if (battleError) throw new Error(battleError.message);

      const roomRes = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId: battle.id, topic: topic.trim() }),
      });

      const roomData = await roomRes.json();
      if (roomData.error) throw new Error(roomData.error);

      await supabase.from('battles').update({ room_name: roomData.roomName }).eq('id', battle.id);

      setCreatedBattle({ ...battle, room_name: roomData.roomName, expires_at: expiresAt });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function cancelChallenge() {
    if (!createdBattle) return;
    await supabase.from('battles').update({ status: 'expired' }).eq('id', createdBattle.id);
    router.push('/battle');
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const timerPct = (seekTimeLeft / SEEK_DURATION) * 100;
  const timerColor = seekTimeLeft <= 60 ? '#EF4444' : seekTimeLeft <= 180 ? '#F59E0B' : '#3B82F6';

  return (
    <main className={styles.main}>
      <div className={styles.page}>
        <div className={styles.header}>
          <Link href="/battle" className={styles.backBtn}>← Back</Link>
          <h1 className={styles.title}>Start a Battle</h1>
          <p className={styles.sub}>Pick a topic, choose your stance, and challenge someone to debate you live.</p>
        </div>

        {step === 1 && (
          <div className={styles.stepWrap}>
            <div className={styles.stepLabel}>Step 1 of 2 — Pick your topic</div>
            <div className={styles.topicGrid}>
              {TOPICS.map((t, i) => (
                <button key={i}
                  className={`${styles.topicBtn} ${selectedTopic === t ? styles.topicSelected : ''}`}
                  onClick={() => { setSelectedTopic(t); setCustomTopic(''); }}
                >
                  <span className={styles.topicTag}>{t.tag}</span>
                  <span className={styles.topicText}>"{t.text}"</span>
                </button>
              ))}
              <button
                className={`${styles.topicBtn} ${selectedTopic === 'custom' ? styles.topicSelected : ''}`}
                onClick={() => setSelectedTopic('custom')}
              >
                <span className={styles.topicTag}>✏️ Custom</span>
                <span className={styles.topicText}>Write your own topic</span>
              </button>
            </div>
            {selectedTopic === 'custom' && (
              <textarea className={styles.customInput} placeholder="Write your debate topic here..."
                value={customTopic} onChange={e => setCustomTopic(e.target.value)} maxLength={200} rows={3} autoFocus />
            )}
            <button className={styles.nextBtn} onClick={() => setStep(2)}
              disabled={!selectedTopic || (selectedTopic === 'custom' && !customTopic.trim())}>
              Next: Choose your stance →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepWrap}>
            <div className={styles.stepLabel}>Step 2 of 2 — Choose your stance</div>
            <div className={styles.topicDisplay}>"{topic}"</div>
            <div className={styles.stanceGrid}>
              <button className={`${styles.stanceBtn} ${styles.stanceBtnFor} ${stance === 'for' ? styles.stanceSelected : ''}`} onClick={() => setStance('for')}>
                <span className={styles.stanceIcon}>✊</span>
                <span className={styles.stanceLabel}>I'm FOR this</span>
                <span className={styles.stanceSub}>I'll argue in favor of this statement</span>
              </button>
              <button className={`${styles.stanceBtn} ${styles.stanceBtnAgainst} ${stance === 'against' ? styles.stanceSelected : ''}`} onClick={() => setStance('against')}>
                <span className={styles.stanceIcon}>🚫</span>
                <span className={styles.stanceLabel}>I'm AGAINST this</span>
                <span className={styles.stanceSub}>I'll argue against this statement</span>
              </button>
            </div>
            {error && <div className={styles.errorMsg}>{error}</div>}
            {!profile?.username && !profileLoading && user && (
              <div className={styles.errorMsg}>
                ⚠️ Profile not found. Please go to <Link href="/settings" style={{ color: '#60A5FA' }}>Settings</Link> and set a username first.
              </div>
            )}
            <div className={styles.stepActions}>
              <button className={styles.backStepBtn} onClick={() => setStep(1)}>← Back</button>
              <button className={styles.nextBtn} onClick={createBattle}
                disabled={!stance || creating}>
                {creating ? 'Creating room...' : profileLoading ? 'Almost ready...' : '⚔️ Post Challenge →'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && createdBattle && (
          <div className={styles.stepWrap}>
            {battleAccepted ? (
              <div className={styles.acceptedWrap}>
                <div className={styles.acceptedIcon}>🔥</div>
                <h2 className={styles.acceptedTitle}>Challenge accepted!</h2>
                <p className={styles.acceptedSub}>
                  {acceptedBy ? `@${acceptedBy}` : 'Your opponent'} is ready to battle. Taking you to the room now...
                </p>
                <div className={styles.acceptedSpinner}></div>
              </div>
            ) : seekExpired ? (
              <div className={styles.expiredWrap}>
                <div className={styles.expiredIcon}>⏰</div>
                <h2 className={styles.expiredTitle}>Challenge expired</h2>
                <p className={styles.expiredSub}>Nobody accepted in 10 minutes. Try posting again.</p>
                <Link href="/battle/start" className={styles.nextBtn} style={{ textDecoration: 'none', textAlign: 'center' }}>
                  Post a new challenge →
                </Link>
                <Link href="/battle" className={styles.laterBtn}>Browse open challenges</Link>
              </div>
            ) : (
              <>
                <div className={styles.seekingHeader}>
                  <div className={styles.seekingPulse}></div>
                  <span className={styles.seekingLabel}>Looking for an opponent...</span>
                </div>
                <div className={styles.topicDisplay}>"{topic}"</div>
                <div className={styles.stanceDisplay}>
                  Your stance: <strong>{stance === 'for' ? 'FOR ✊' : 'AGAINST 🚫'}</strong>
                </div>
                <div className={styles.countdownWrap}>
                  <div className={styles.countdownTime} style={{ color: timerColor }}>{formatTime(seekTimeLeft)}</div>
                  <div className={styles.countdownLabel}>until challenge expires</div>
                  <div className={styles.countdownTrack}>
                    <div className={styles.countdownFill} style={{ width: `${timerPct}%`, background: timerColor }} />
                  </div>
                </div>
                <div className={styles.seekingInfo}>
                  Your challenge is live on the <Link href="/battle" className={styles.seekingLink}>battles page</Link>.
                  Anyone can accept it while this timer runs.
                </div>
                <button className={styles.cancelBtn} onClick={cancelChallenge}>Cancel challenge</button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}