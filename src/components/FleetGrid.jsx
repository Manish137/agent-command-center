import React from 'react';
import { Play, Pause, Square, Activity, Cpu, HardDrive, Zap, RefreshCw, Layers } from 'lucide-react';

export default function FleetGrid({ agents, onAgentAction, systemStats }) {
  const getBadgeClass = (status) => {
    switch (status) {
      case 'running': return 'badge-running';
      case 'paused': return 'badge-paused';
      case 'error': return 'badge-error';
      default: return 'badge-idle';
    }
  };

  return (
    <div>
      {/* Hardware Telemetry Strip */}
      {systemStats && (
        <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Cpu style={{ color: 'var(--accent-cyan)' }} size={20} />
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Host Hardware Profile</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{systemStats.cpuModel} ({systemStats.cpuCount} Cores)</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>RAM Usage</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: systemStats.memUsagePercent > 80 ? '#f87171' : '#34d399' }}>
                {systemStats.memUsagePercent}% ({systemStats.freeMemMB} MB Free)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Host OS Platform</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{systemStats.platform.toUpperCase()}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 className="heading-font" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Active Agent Fleet Matrix</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Real local process execution, hardware metrics, and live telemetry</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {agents.map((agent) => (
          <div key={agent.id} className="glass-panel glass-card-interactive" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            
            {/* Top Glowing accent line if running */}
            {agent.status === 'running' && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #10b981, #06b6d4, #6366f1)', animation: 'pulse-glow 1.5s infinite' }}></div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className={`badge ${getBadgeClass(agent.status)}`}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
                  {agent.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                  {agent.category}
                </span>
              </div>

              <h3 className="heading-font" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                {agent.name}
              </h3>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '16px' }}>
                {agent.description}
              </p>

              {/* LIVE EXECUTION MONITOR PANEL */}
              {agent.status === 'running' && agent.execution && (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#34d399' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14} className="animate-pulse-slow" /> ACTIVE LOCAL PROCESS</span>
                    <span>{agent.execution.progress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ width: `${agent.execution.progress}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #06b6d4)', transition: 'width 0.3s ease' }}></div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {agent.execution.step}
                  </div>
                  {agent.execution.currentItem && (
                    <div className="mono-font" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      ▶ {agent.execution.currentItem}
                    </div>
                  )}
                </div>
              )}

              {/* Stats drawer when idle */}
              {agent.status !== 'running' && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Real Executions:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{agent.tasksCompleted}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>System Uptime:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{agent.uptime}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Last Active:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{agent.lastRun}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              {agent.status === 'running' ? (
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => onAgentAction(agent.id, 'pause')}>
                  <Pause size={14} /> Pause
                </button>
              ) : (
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onAgentAction(agent.id, 'start')}>
                  <Play size={14} /> Start Agent Process
                </button>
              )}
              
              <button className="btn btn-secondary" title="Stop Agent" onClick={() => onAgentAction(agent.id, 'stop')}>
                <Square size={14} />
              </button>
              
              <button className="btn btn-secondary" title="Run Diagnostics" onClick={() => onAgentAction(agent.id, 'run_diagnostics')}>
                <Activity size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
