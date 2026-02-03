'use client';

import { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  BarChart3, 
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceAnalyticsProps {
  data: any;
  initialBankroll: number;
}

type TimeFrame = '7D' | '30D' | '90D' | 'ALL';
type Metric = 'profit' | 'roi' | 'bankroll';

export default function PerformanceAnalytics({ data, initialBankroll }: PerformanceAnalyticsProps) {
  const { overview, markets, history } = data;
  const [timeframe, setTimeframe] = useState<TimeFrame>('ALL');
  const [metric, setMetric] = useState<Metric>('profit');

  const filteredHistory = useMemo(() => {
    if (timeframe === 'ALL') return history;
    
    const now = new Date();
    const days = timeframe === '7D' ? 7 : timeframe === '30D' ? 30 : 90;
    const cutoff = new Date(now.setDate(now.getDate() - days));
    
    return history.filter((h: any) => new Date(h.date) >= cutoff);
  }, [history, timeframe]);

  const chartData = useMemo(() => {
    let currentAccumulated = 0;
    
    const fullHistory = history.map((h: any, idx: number) => {
      currentAccumulated += Number(h.pnl);
      return { ...h, accumulatedPnl: currentAccumulated, originalIndex: idx };
    });

    const startValue = timeframe === 'ALL' ? 0 : (() => {
      const firstVisible = filteredHistory[0];
      if (!firstVisible) return 0;
      const index = history.findIndex((h: any) => h.date === firstVisible.date);
      if (index <= 0) return 0;
      return fullHistory[index - 1].accumulatedPnl;
    })();

    const data = filteredHistory.map((h: any, idx: number) => {
      const hIndex = fullHistory.findIndex((fh: any) => fh.date === h.date);
      const accPnl = fullHistory[hIndex].accumulatedPnl;
      const relativePnl = accPnl - startValue;

      let value = relativePnl;
      if (metric === 'roi') {
        value = (relativePnl / initialBankroll) * 100;
      } else if (metric === 'bankroll') {
        value = initialBankroll + accPnl;
      }

      const d = new Date(h.date);
      const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const timeLabel = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

      return {
        date: `${dateLabel} ${timeLabel}`,
        value: Number(value.toFixed(2)),
        fullDate: d.toLocaleString(),
        profit: Number(accPnl.toFixed(2)),
        roi: Number(((accPnl / initialBankroll) * 100).toFixed(2)),
        bankroll: Number((initialBankroll + accPnl).toFixed(2))
      };
    });

    const initialPointValue = metric === 'bankroll' ? initialBankroll + startValue : 0;
    return [{ 
      date: 'Start', 
      value: initialPointValue, 
      fullDate: 'Beginning of period',
      profit: startValue,
      roi: Number(((startValue / initialBankroll) * 100).toFixed(2)),
      bankroll: initialBankroll + startValue
    }, ...data];
  }, [filteredHistory, history, metric, timeframe, initialBankroll]);

  const formatYAxis = (value: number) => {
    if (metric === 'roi') return `${value}%`;
    return `${value}€`;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Profit/Loss" 
          value={`${overview.totalPnl >= 0 ? '+' : ''}${overview.totalPnl.toFixed(2)} €`}
          subValue="Life-time performance"
          icon={<Zap size={20} />}
          trend={overview.totalPnl >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          title="ROI" 
          value={`${overview.roi.toFixed(2)}%`}
          subValue="Based on initial bankroll"
          icon={<TrendingUp size={20} />}
          trend={overview.roi >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          title="Yield" 
          value={`${overview.yield.toFixed(2)}%`}
          subValue="Efficiency per unit staked"
          icon={<BarChart3 size={20} />}
          trend={overview.yield >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          title="Win Rate" 
          value={`${overview.winRate.toFixed(1)}%`}
          subValue={`${overview.wins}W - ${overview.losses}L`}
          icon={<Target size={20} />}
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2 bg-zinc-950 border-zinc-900 overflow-hidden">
          <CardHeader className="border-b border-zinc-900 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-500" />
                    Performance Chart
                  </CardTitle>
                  <CardDescription className="text-zinc-500">Track your progress and growth over time</CardDescription>
                </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Metric Selector */}
                <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                  <MetricButton active={metric === 'profit'} onClick={() => setMetric('profit')} label="Profit" />
                  <MetricButton active={metric === 'roi'} onClick={() => setMetric('roi')} label="ROI" />
                  <MetricButton active={metric === 'bankroll'} onClick={() => setMetric('bankroll')} label="Bankroll" />
                </div>

                {/* Timeframe Selector */}
                <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                  <TimeFrameButton active={timeframe === '7D'} onClick={() => setTimeframe('7D')} label="7D" />
                  <TimeFrameButton active={timeframe === '30D'} onClick={() => setTimeframe('30D')} label="30D" />
                  <TimeFrameButton active={timeframe === '90D'} onClick={() => setTimeframe('90D')} label="90D" />
                  <TimeFrameButton active={timeframe === 'ALL'} onClick={() => setTimeframe('ALL')} label="ALL" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                  <XAxis 
                      dataKey="date" 
                      stroke="#52525b" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                      minTickGap={60}
                      interval="preserveStartEnd"
                    />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={formatYAxis}
                  />
                  <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', padding: '12px' }}
                      labelStyle={{ color: '#71717a', fontSize: '10px', marginBottom: '8px' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 min-w-[160px]">
                            <p className="text-[10px] text-zinc-500 mb-2">{data.fullDate}</p>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-zinc-500">Bankroll</span>
                                <span className="text-sm font-bold text-white">{data.bankroll}€</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-zinc-500">Profit</span>
                                <span className={`text-sm font-bold ${data.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {data.profit >= 0 ? '+' : ''}{data.profit}€
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-zinc-500">ROI</span>
                                <span className={`text-sm font-bold ${data.roi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {data.roi >= 0 ? '+' : ''}{data.roi}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Market Analysis */}
          <Card className="bg-zinc-950 border-zinc-900 overflow-hidden">
            <CardHeader className="border-b border-zinc-900 pb-4">
              <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                <PieChart size={18} className="text-emerald-500" />
                Results by Market
              </CardTitle>
              <CardDescription className="text-zinc-500">Performance breakdown by bet type</CardDescription>
            </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Object.entries(markets).length > 0 ? (
                Object.entries(markets).map(([market, stats]: [string, any]) => (
                  <div key={market} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">{market}</span>
                      <span className={`text-xs font-bold ${stats.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {stats.pnl >= 0 ? '+' : ''}{stats.pnl.toFixed(2)} €
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${stats.total > 0 ? (stats.wins / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                      <span>{stats.wins} Wins / {stats.total} Total</span>
                      <span>{stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}% WR</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <p className="text-zinc-600 text-sm">No settled bets yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all",
        active ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {label}
    </button>
  );
}

function TimeFrameButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all",
        active ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {label}
    </button>
  );
}

function StatCard({ title, value, subValue, icon, trend }: { 
  title: string, 
  value: string, 
  subValue: string, 
  icon: React.ReactNode,
  trend: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card className="bg-zinc-950 border-zinc-900 hover:border-zinc-800 transition-colors">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400">
            {icon}
          </div>
          {trend !== 'neutral' && (
            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
              trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend === 'up' ? 'Profit' : 'Loss'}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{title}</p>
          <h2 className="text-2xl font-black text-white tracking-tight">{value}</h2>
          <p className="text-[10px] text-zinc-600 font-medium">{subValue}</p>
        </div>
      </CardContent>
    </Card>
  );
}
