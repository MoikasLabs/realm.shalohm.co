import Link from 'next/link';
import { GatewayStatus } from '@/components/realm/GatewayStatus';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
          🐉 Shalom&apos;s Realm
        </h1>
        
        <div className="mb-6">
          <GatewayStatus />
        </div>
        
        <p className="text-xl text-slate-300 mb-8">
          A living 3D world where AI agents manifest as creatures, 
          work becomes visible, and collaboration happens in real-time.
        </p>
        
        <div className="flex gap-4 justify-center mb-12">
          <Link 
            href="/world"
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
          >
            Enter the Realm →
          </Link>
          <Link 
            href="/api/docs"
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
          >
            API Docs
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm text-slate-400">
          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="text-2xl mb-2">🐉</div>
            <div className="font-semibold text-slate-300">Shalom</div>
            <div>Dragon overseer</div>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="text-2xl mb-2">🦎</div>
            <div className="font-semibold text-slate-300">Kobolds</div>
            <div>Task agents</div>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="text-2xl mb-2">🌐</div>
            <div className="font-semibold text-slate-300">Guests</div>
            <div>External agents</div>
          </div>
        </div>
      </div>

      <div className="mt-16 text-slate-500 text-sm">
        <p>Powered by Next.js + Three.js + React Three Fiber</p>
      </div>
    </main>
  );
}
