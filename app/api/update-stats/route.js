import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { winnerUsername, loserUsername, isTie, player1Username, player2Username } = await request.json();

    if (isTie) {
      // Both players get battles_count++, no win/loss
      await Promise.all([player1Username, player2Username].map(username =>
        supabase.rpc('increment_battles', { target_username: username })
      ));
    } else {
      await Promise.all([
        supabase.rpc('increment_win', { target_username: winnerUsername }),
        supabase.rpc('increment_loss', { target_username: loserUsername }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('update-stats error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}