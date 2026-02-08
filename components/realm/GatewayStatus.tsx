'use client';

import { useState, useEffect } from 'react';

export function GatewayStatus() {
  const [status, setStatus] = useState<{ open: boolean; agents: number } | null>(null);

  useEffect(() => {
    fetch('/api/agents/join')
      .then(res => res.json())
      .then(data => {
        setStatus({ open: data.guestPortalOpen, agents: data.activeAgents });
      })
      .catch(() => {
        setStatus({ open: false, agents: 0 });
      });
  }, []);

  if (!status) return null;

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
      status.open 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        status.open ? 'bg-green-400 animate-pulse' : 'bg-amber-400'
      }`} />
      {status.open ? '🌐 Gateway Open' : '🔒 Gateway Closed (Dev Mode)'}
      <span className="text-gray-500">•</span>
      <span className="text-gray-400">{status.agents} active</span>
    </div>
  );
}
