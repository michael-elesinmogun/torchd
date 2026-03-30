'use client';
import { useState, useEffect } from 'react';
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

export default function StartBattle() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [step, setStep] = useState(1); // 1: pick topic, 2: pick stance, 3: creating room
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [customTopic, setCustomTopic] = useState('');
  const [stance, setStance] = useState(null); // 'for' | 'against'
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdBattle, setCreatedBattle] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push('/login'); return; }
      setUser(session.user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', session.user.id)
        .single();

      setProfile(profileData);
    }
    init();
  }, []);

  const topic = selectedTopic === 'custom' ? customTopic : selectedTopic?.text || '';

  async function createBattle() {
    if (!topic.trim() || !stance) return;
    setCreating(true);
    setError('');

    try {
      // 1. Insert battle into Supabase
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .insert({
          topic: topic.trim(),
          player1_username: profile.username,
          player1_stance: stance === 'for' ? `FOR — ${topic.trim().slice(0, 40)}` : `AGAINST — ${topic.trim().slice(0, 40)}`,
          status: 'waiting',
        })
        .select()
        .single();

      if (battleError) throw new Error(battleError.message);

      // 2. Create Daily.co room
      const roomRes = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId: battle.id, topic: topic.trim() }),
      });

      const roomData = await roomRes.json();
      if (roomData.error) throw new Error(roomData.error);

      // 3. Save room URL to battle
      await supabase
        .from('battles')
        .update({ room_url: roomData.url, status: 'waiting' })
        .eq('id', battle.id);

      setCreatedBattle({ ...battle, room_url: roomData.url });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function copyLink() {
    const link = `${window.location.origin}/battle/room/${createdBattle.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function joinRoom() {
    router.push(`/battle/room/${createdBattle.id}`);
  }

  return (
    <main className={styles.main}>
      <div className={styles.page}>

        <div className={styles.header}>
          <Link href="/battle" className={styles.backBtn}>← Back</Link>
          <h1 className={styles.title}>Start a Battle</h1>
          <p className={styles.sub}>Pick a topic, choose your stance, and challenge someone to debate you live.</p>
        </div>

        {/* Step 1: Pick topic */}
        {step === 1 && (
          <div className={styles.stepWrap}>
            <div className={styles.stepLabel}>Step 1 of 2 — Pick your topic</div>

            <div className={styles.topicGrid}>
              {TOPICS.map((t, i) => (
                <button
                  key={i}
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
              <textarea
                className={styles.customInput}
                placeholder="Write your debate topic here..."
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                maxLength={200}
                rows={3}
                autoFocus
              />
            )}

            <button
              className={styles.nextBtn}
              onClick={() => setStep(2)}
              disabled={!selectedTopic || (selectedTopic === 'custom' && !customTopic.trim())}
            >
              Next: Choose your stance →
            </button>
          </div>
        )}

        {/* Step 2: Pick stance */}
        {step === 2 && (
          <div className={styles.stepWrap}>
            <div className={styles.stepLabel}>Step 2 of 2 — Choose your stance</div>

            <div className={styles.topicDisplay}>"{topic}"</div>

            <div className={styles.stanceGrid}>
              <button
                className={`${styles.stanceBtn} ${styles.stanceBtnFor} ${stance === 'for' ? styles.stanceSelected : ''}`}
                onClick={() => setStance('for')}
              >
                <span className={styles.stanceIcon}>✊</span>
                <span className={styles.stanceLabel}>I'm FOR this</span>
                <span className={styles.stanceSub}>I'll argue in favor of this statement</span>
              </button>

              <button
                className={`${styles.stanceBtn} ${styles.stanceBtnAgainst} ${stance === 'against' ? styles.stanceSelected : ''}`}
                onClick={() => setStance('against')}
              >
                <span className={styles.stanceIcon}>🚫</span>
                <span className={styles.stanceLabel}>I'm AGAINST this</span>
                <span className={styles.stanceSub}>I'll argue against this statement</span>
              </button>
            </div>

            {error && <div className={styles.errorMsg}>{error}</div>}

            <div className={styles.stepActions}>
              <button className={styles.backStepBtn} onClick={() => setStep(1)}>← Back</button>
              <button
                className={styles.nextBtn}
                onClick={createBattle}
                disabled={!stance || creating}
              >
                {creating ? 'Creating your battle room...' : '⚔️ Create Battle Room →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Room created */}
        {step === 3 && createdBattle && (
          <div className={styles.stepWrap}>
            <div className={styles.successIcon}>🔥</div>
            <h2 className={styles.successTitle}>Your battle room is ready!</h2>
            <p className={styles.successSub}>Share the link below with your opponent. Once they join, the battle begins.</p>

            <div className={styles.topicDisplay}>"{topic}"</div>

            <div className={styles.linkBox}>
              <div className={styles.linkUrl}>{typeof window !== 'undefined' ? window.location.origin : ''}/battle/room/{createdBattle.id}</div>
              <button className={styles.copyBtn} onClick={copyLink}>
                {copied ? '✓ Copied!' : '📋 Copy link'}
              </button>
            </div>

            <div className={styles.roomActions}>
              <button className={styles.joinRoomBtn} onClick={joinRoom}>
                🎥 Join the room now →
              </button>
              <Link href="/battle" className={styles.laterBtn}>
                I'll join later
              </Link>
            </div>

            <p className={styles.roomNote}>
              Your opponent will need a Torchd account to join. The room stays open for 3 hours.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}