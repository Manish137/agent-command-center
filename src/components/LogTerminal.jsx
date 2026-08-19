import React from 'react';
import { Terminal, Trash2, ShieldCheck } from 'lucide-react';

export default function LogTerminal({ logs }) {
  const getLogLevelColor = (level) => {
    switch (level) {
      case 'success': return '#34d399';
      case 'warning': return '#fbbf24';
      case 'error': return '#f87171';
      default: return '#38bdf8';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="heading-font" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Live Telemetry & Console Stream</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={16} style={{ color: 'var(--accent-emerald)' }} /> Active Monitoring
        </div>
      </div>

      <div className="mono-font" style={{ flex: 1, background: '#070a12', borderRadius: '12px', padding: '16px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', lineHeight: '1.6' }}>
        {logs.map((log) => (
          <div key={log.id} style={{ marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--text-dim)', minWidth: '75px', userSelect: 'none' }}>[{log.timestamp}]</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 600, minWidth: '100px' }}>@{log.agentId}</span>
            <span style={{ color: getLogLevelColor(log.level), flex: 1 }}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
