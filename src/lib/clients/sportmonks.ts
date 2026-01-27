const BASE_URL = 'https://api.sportmonks.com/v3/football';
const API_TOKEN = process.env.SPORTMONKS_API_TOKEN;

export const EUROPEAN_LEAGUE_IDS = [
  8, 9, 24, 27, 72, 82, 181, 208, 244, 271, 301, 384, 387, 390, 444, 453, 462, 486, 501, 564, 567, 570, 573, 591, 600, 609, 1371
];

export async function fetchSportMonks(endpoint: string, params: Record<string, string> = {}) {
  if (!API_TOKEN) {
    throw new Error('SPORTMONKS_API_TOKEN is not set');
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.append('api_token', API_TOKEN);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });

  console.log(`Fetching SportMonks: ${url.toString().replace(API_TOKEN, 'TOKEN')}`);
  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`SportMonks API error: ${response.status} ${response.statusText} ${errorBody}`);
  }
  return response.json();
}

export async function getUpcomingFixtures() {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  
  const start = now.toISOString().split('T')[0];
  const end = threeDaysLater.toISOString().split('T')[0];

  const data = await fetchSportMonks(`fixtures/between/${start}/${end}`, {
    include: 'participants;league;scores',
    filters: `fixtureLeagues:${EUROPEAN_LEAGUE_IDS.join(',')};fixtureStates:1`,
  });

  return data.data || [];
}

export async function getTeamHistory(teamId: number) {
  // Using the team latest endpoint which includes recent fixtures (past 6 months)
  // This is often more reliable than date-range queries for history in v3
  const data = await fetchSportMonks(`teams/${teamId}`, {
    include: 'latest.scores;latest.participants',
  });

  return data.data?.latest || [];
}

export async function getLeagueAvgGoals(leagueId: number) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const start = thirtyDaysAgo.toISOString().split('T')[0];
  const end = now.toISOString().split('T')[0];

  const data = await fetchSportMonks(`fixtures/between/${start}/${end}`, {
    include: 'scores',
    filters: `fixtureLeagues:${leagueId};fixtureStates:5`,
    per_page: '50'
  });

  const results = data.data || [];
  if (results.length === 0) return 2.5;

  let totalGoals = 0;
  let count = 0;

  for (const f of results) {
    const h = f.scores?.find((s: any) => s.score.participant === 'home')?.score?.goals ?? 0;
    const a = f.scores?.find((s: any) => s.score.participant === 'away')?.score?.goals ?? 0;
    
    totalGoals += h + a;
    count++;
  }

  return count > 0 ? totalGoals / count : 2.5;
}
