import { createClient } from '@/lib/supabase/server';
import { 
  Bankroll, 
  BetCandidate, 
  PlacedBet, 
  KellyResult, 
  DEFAULT_KELLY_CONFIG,
  BetResult
} from './types';
import { computeStakeDecision } from './kelly';

// Force reload: 2026-01-30
export class BettingService {
  private static async getUserId(supabaseClient?: any) {
    const supabase = supabaseClient || await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    return user.id;
  }

  static async getOrCreateBankroll(supabaseClient?: any): Promise<Bankroll> {
    const supabase = supabaseClient || await createClient();
    
    // If no client provided, we need to get user ID from session
    // If admin client is provided, this might fail if we don't have a userId
    // But for automated settlement we don't call getOrCreateBankroll, we fetch existing ones
    const userId = await this.getUserId(supabase);

    const { data: bankroll, error } = await supabase
      .from('user_bankrolls')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (bankroll) {
      return this.mapBankroll(bankroll);
    }

    // Create default bankroll
    const initialAmount = 1000;
    const { data: newBankroll, error: createError } = await supabase
      .from('user_bankrolls')
      .insert({
        user_id: userId,
        currency: 'EUR',
        initial_bankroll: initialAmount,
        current_bankroll: initialAmount,
        peak_bankroll: initialAmount,
        open_exposure: 0,
        consecutive_losses: 0,
        recent_results: [],
        last_n_results: [],
        day_key: new Date().toISOString().split('T')[0],
        day_risk_used: 0
      })
      .select()
      .single();

    if (createError) throw createError;
    return this.mapBankroll(newBankroll);
  }

  static async getStakeRecommendation(candidate: BetCandidate, supabaseClient?: any): Promise<KellyResult> {
    const bankroll = await this.getOrCreateBankroll(supabaseClient);
    const decision = computeStakeDecision(candidate, bankroll, DEFAULT_KELLY_CONFIG);
    return decision.kellyResult;
  }

  static async placeBet(candidate: BetCandidate, supabaseClient?: any): Promise<PlacedBet> {
    const supabase = supabaseClient || await createClient();
    const userId = await this.getUserId(supabase);
    const bankroll = await this.getOrCreateBankroll(supabase);
    const decision = computeStakeDecision(candidate, bankroll, DEFAULT_KELLY_CONFIG);
    const kelly = decision.kellyResult;

    if (kelly.finalStakeAmount <= 0) {
      throw new Error('Stake amount too low or negative expected value');
    }

    // 1. Create the bet record
    const { data: bet, error: betError } = await supabase
      .from('user_bets')
      .insert({
        user_id: userId,
        prediction_id: candidate.predictionId,
        fixture_id: candidate.fixtureId,
        market: candidate.market,
        selection: candidate.selection,
        line: candidate.line,
        odds_decimal: candidate.oddsDecimal,
        model_probability: candidate.modelProbability,
        stake: kelly.finalStakeAmount,
        stake_pct: kelly.finalStakePct,
        currency: bankroll.currency,
        status: 'OPEN',
        locked_at: new Date().toISOString(),
        kelly_data: kelly
      })
      .select()
      .single();

    if (betError) throw betError;

    // 2. Update bankroll exposure
    const { error: bankrollError } = await supabase
      .from('user_bankrolls')
      .update({
        open_exposure: Number(bankroll.openExposure) + kelly.finalStakeAmount,
        day_risk_used: Number(bankroll.dayRiskUsed) + kelly.finalStakeAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', bankroll.id);

    if (bankrollError) throw bankrollError;

    return this.mapBet(bet);
  }

  static async settleBet(betId: string, result: BetResult, supabaseClient?: any): Promise<PlacedBet> {
    const supabase = supabaseClient || await createClient();
    
    // 1. Fetch bet
    const { data: betData, error: betFetchError } = await supabase
      .from('user_bets')
      .select('*')
      .eq('id', betId)
      .single();

    if (betFetchError) throw betFetchError;
    const bet = this.mapBet(betData);

    // 2. Fetch bankroll
    const { data: bankrollData, error: bankrollFetchError } = await supabase
      .from('user_bankrolls')
      .select('*')
      .eq('user_id', bet.userId)
      .single();

    if (bankrollFetchError) throw bankrollFetchError;
    const bankroll = this.mapBankroll(bankrollData);

    if (bet.status !== 'OPEN') {
      throw new Error('Bet is already settled');
    }

    // 2. Calculate PnL
    let pnl = 0;
    if (result === 'WIN') {
      pnl = bet.stake * (bet.oddsDecimal - 1);
    } else if (result === 'LOSS') {
      pnl = -bet.stake;
    }

    const newStatus = result === 'WIN' ? 'WON' : result === 'LOSS' ? 'LOST' : 'VOID';
    const newBalance = Number(bankroll.currentBankroll) + pnl;
    
    // 3. Update Bankroll
    const newRecentResults = [...bankroll.last50Results, result].slice(-50);
    const newConsecutiveLosses = result === 'LOSS' ? bankroll.consecutiveLosses + 1 : 
                                 (result === 'WIN' ? 0 : bankroll.consecutiveLosses);

    const { error: bankrollError } = await supabase
      .from('user_bankrolls')
      .update({
        current_bankroll: newBalance,
        peak_bankroll: Math.max(Number(bankroll.peakBankroll), newBalance),
        open_exposure: Math.max(0, Number(bankroll.openExposure) - bet.stake),
        consecutive_losses: newConsecutiveLosses,
        last_n_results: newRecentResults,
        updated_at: new Date().toISOString()
      })
      .eq('id', bankroll.id);

    if (bankrollError) throw bankrollError;

    // 4. Update Bet
    const { data: updatedBet, error: updateError } = await supabase
      .from('user_bets')
      .update({
        status: newStatus,
        pnl: pnl,
        settled_at: new Date().toISOString()
      })
      .eq('id', betId)
      .select()
      .single();

    if (updateError) throw updateError;

    return this.mapBet(updatedBet);
  }

  static mapBankroll(data: any): Bankroll {
    return {
      id: data.id,
      userId: data.user_id,
      currency: data.currency,
      initialBankroll: Number(data.initial_bankroll),
      currentBankroll: Number(data.current_bankroll),
      peakBankroll: Number(data.peak_bankroll),
      openExposure: Number(data.open_exposure),
      consecutiveLosses: data.consecutive_losses,
      last50Results: data.last_n_results || [],
      dayKey: data.day_key,
      dayRiskUsed: Number(data.day_risk_used),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  static mapBet(data: any): PlacedBet {
    const fixtureData = Array.isArray(data.fixtures) ? data.fixtures[0] : data.fixtures;

    return {
      id: data.id,
      userId: data.user_id,
      predictionId: data.prediction_id,
      fixtureId: data.fixture_id,
      market: data.market,
      selection: data.selection,
      line: data.line ? Number(data.line) : undefined,
      oddsDecimal: Number(data.odds_decimal),
      modelProbability: Number(data.model_probability),
      stake: Number(data.stake),
      stakePct: Number(data.stake_pct),
      currency: data.currency,
      status: data.status,
      pnl: data.pnl ? Number(data.pnl) : undefined,
      lockedAt: new Date(data.locked_at),
      settledAt: data.settled_at ? new Date(data.settled_at) : undefined,
      kellyData: data.kelly_data,
      createdAt: new Date(data.created_at),
      fixture: fixtureData ? {
        homeTeam: fixtureData.home_team?.name || 'Unknown',
        awayTeam: fixtureData.away_team?.name || 'Unknown',
        startingAt: fixtureData.kickoff_at
      } : undefined
    };
  }
}
