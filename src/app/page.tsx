import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white font-sans selection:bg-blue-500/30">
      <div className="relative w-full max-w-2xl px-6 py-24 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/20 blur-[120px] rounded-full" />
        
          <h1 className="text-6xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            WINLYTICS.AI
          </h1>
        
        <p className="text-lg text-zinc-400 mb-12 max-w-md mx-auto leading-relaxed">
          Smart football predictions powered by statistical models. 
          Covering 25+ European leagues daily.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="cursor-pointer group relative flex h-14 items-center justify-center gap-2 rounded-xl bg-white px-8 text-black transition-all hover:bg-zinc-200 active:scale-95 w-full sm:w-auto font-bold"
          >
            Open Dashboard
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-3 gap-8 border-t border-zinc-900 pt-12">
          <div>
            <p className="text-2xl font-bold">25+</p>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Leagues</p>
          </div>
          <div>
            <p className="text-2xl font-bold">70%+</p>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Min. Confidence</p>
          </div>
          <div>
            <p className="text-2xl font-bold">Daily</p>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Updates</p>
          </div>
        </div>
      </div>
    </div>
  );
}
