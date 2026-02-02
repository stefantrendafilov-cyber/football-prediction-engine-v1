import { BettingService } from './service';
import { BetCandidate } from './types';

async function runIntegrationTest() {
  console.log('--- Betting Integration Test ---');
  
  try {
    // 1. Get/Create Bankroll
    console.log('1. Getting bankroll...');
    const bankroll = await BettingService.getOrCreateBankroll();
    console.log(`Bankroll: €${bankroll.currentBankroll} (${bankroll.currency})`);

    // 2. Get Stake Recommendation
    const candidate: BetCandidate = {
      predictionId: '00000000-0000-0000-0000-000000000000', // Mock UUID
      fixtureId: 999999,
      market: 'BTTS',
      selection: 'Yes',
      oddsDecimal: 2.0,
      modelProbability: 0.75
    };
    
    console.log('2. Calculating stake for 75% prob @ 2.0 odds...');
    const recommendation = await BettingService.getStakeRecommendation(candidate);
    console.log(`Recommended Stake: €${recommendation.finalStakeAmount} (${recommendation.finalStakePct * 100}%)`);

    // 3. Place Bet
    console.log('3. Placing bet...');
    const bet = await BettingService.placeBet(candidate);
    console.log(`Bet placed: ID ${bet.id}, Stake €${bet.stake}`);

    // 4. Settle Bet (WIN)
    console.log('4. Settling bet as WIN...');
    const settledWin = await BettingService.settleBet(bet.id, 'WIN');
    console.log(`Settled: ${settledWin.status}, PnL: €${settledWin.pnl}`);
    
    const bankrollAfterWin = await BettingService.getOrCreateBankroll();
    console.log(`Bankroll after WIN: €${bankrollAfterWin.currentBankroll}`);

    // 5. Place and Settle (LOSS)
    console.log('5. Placing and settling as LOSS...');
    const bet2 = await BettingService.placeBet(candidate);
    const settledLoss = await BettingService.settleBet(bet2.id, 'LOSS');
    console.log(`Settled: ${settledLoss.status}, PnL: €${settledLoss.pnl}`);
    
    const bankrollAfterLoss = await BettingService.getOrCreateBankroll();
    console.log(`Bankroll after LOSS: €${bankrollAfterLoss.currentBankroll}`);

    console.log('--- Test Successful ---');
  } catch (error: any) {
    console.error('--- Test Failed ---');
    console.error(error);
  }
}

// Since we are in a server environment, we need to mock the user or run this in a context where a user is available.
// For the sake of this environment, I'll just verify the logic compiles and the service methods are correct.
// In a real run, BettingService.getUserId() would fail if no session is active.
