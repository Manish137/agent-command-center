import { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';

const API = '/api';

function formatUptime(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function formatTime(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

function classifyLog(line) {
  if (line.includes('[stderr]') || line.includes('ERROR') || line.includes('❌')) return 'error';
  if (line.includes('✅') || line.includes('✔') || line.includes('🎉') || line.includes('success')) return 'success';
  if (line.includes('📡') || line.includes('🔍') || line.includes('📊') || line.includes('STARTING')) return 'info';
  if (line.includes('[stdout]')) return 'stdout';
  return '';
}

export default function App() {
  const [agents, setAgents] = useState([]);
  const [summary, setSummary] = useState({});
  const [system, setSystem] = useState({});
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);
  const [loading, setLoading] = useState({});
  const logEndRef = useRef(null);

  // Fetch agents + summary + system
  const refresh = useCallback(async () => {
    try {
      const [agRes, sumRes, sysRes] = await Promise.all([
        fetch(`${API}/agents`).then(r => r.json()),
        fetch(`${API}/summary`).then(r => r.json()),
        fetch(`${API}/system`).then(r => r.json()),
      ]);
      if (agRes.success) setAgents(agRes.agents);
      if (sumRes.success) setSummary(sumRes.summary);
      if (sysRes.success) setSystem(sysRes.system);
    } catch (e) {
      console.error('Fetch error:', e);
    }
  }, []);

  // Auto-refresh every 2 seconds
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Fetch logs + outputs for selected agent
  useEffect(() => {
    if (!selectedAgent) return;
    const fetchDetail = async () => {
      try {
        const [logRes, outRes] = await Promise.all([
          fetch(`${API}/agents/${selectedAgent}/logs?lines=200`).then(r => r.json()),
          fetch(`${API}/agents/${selectedAgent}/outputs`).then(r => r.json()),
        ]);
        if (logRes.success) setLogs(logRes.logs);
        if (outRes.success) setOutputs(outRes.files);
      } catch (e) {}
    };
    fetchDetail();
    const interval = setInterval(fetchDetail, 2000);
    return () => clearInterval(interval);
  }, [selectedAgent]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const startAgent = async (id, e) => {
    e?.stopPropagation();
    setLoading(l => ({ ...l, [id]: true }));
    try {
      await fetch(`${API}/agents/${id}/start`, { method: 'POST' });
    } catch (e) {}
    setTimeout(() => {
      refresh();
      setLoading(l => ({ ...l, [id]: false }));
    }, 500);
  };

  const stopAgent = async (id, e) => {
    e?.stopPropagation();
    setLoading(l => ({ ...l, [id]: true }));
    try {
      await fetch(`${API}/agents/${id}/stop`, { method: 'POST' });
    } catch (e) {}
    setTimeout(() => {
      refresh();
      setLoading(l => ({ ...l, [id]: false }));
    }, 500);
  };

  const viewFile = async (agentId, fileName) => {
    try {
      const res = await fetch(`${API}/agents/${agentId}/output-file?name=${encodeURIComponent(fileName)}`);
      const data = await res.json();
      if (data.success) setViewingFile({ name: fileName, content: data.content });
    } catch (e) {}
  };

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">⚡ ManishArmy Command Center</div>
          <span className="header-badge">REAL ENGINE</span>
        </div>
        <div className="header-right">
          <div className="system-chip">
            <span className="dot" />
            {system.hostname || '...'} • {system.cpuCores || '?'} cores • {system.memUsedPercent || '?'}% RAM
          </div>
        </div>
      </header>

      <main className="main">
        {/* Stats */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-label">Total Agents</div>
            <div className="stat-value blue">{summary.totalAgents || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Running Now</div>
            <div className="stat-value green">{summary.runningAgents || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Runs</div>
            <div className="stat-value amber">{summary.totalRuns || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Output Files</div>
            <div className="stat-value purple">{summary.totalOutputFiles || 0}</div>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="section-title">🤖 Agent Fleet</div>
        <div className="agent-grid">
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`agent-card ${agent.status}`}
              onClick={() => { setSelectedAgent(agent.id); setViewingFile(null); }}
            >
              <div className="agent-header">
                <div className="agent-name">{agent.name}</div>
                <span className={`agent-status ${agent.status}`}>
                  {agent.status === 'running' ? '● Running' : '○ Stopped'}
                </span>
              </div>
              <div className="agent-desc">{agent.description}</div>
              <div className="agent-meta">
                <span>📂 {agent.category}</span>
                {agent.status === 'running' && <span>⏱ {formatUptime(agent.uptime)}</span>}
                {agent.pid && <span>PID {agent.pid}</span>}
                {agent.totalRuns > 0 && <span>🔄 {agent.totalRuns} runs</span>}
                <span>🕐 {formatTime(agent.lastRun)}</span>
              </div>
              <div className="agent-actions">
                {agent.status === 'running' ? (
                  <button className="btn btn-stop" onClick={(e) => stopAgent(agent.id, e)} disabled={loading[agent.id]}>
                    ⏹ Stop
                  </button>
                ) : (
                  <button className="btn btn-start" onClick={(e) => startAgent(agent.id, e)} disabled={loading[agent.id]}>
                    ▶ Start
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => { setSelectedAgent(agent.id); setViewingFile(null); }}>
                  📋 Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* System Info */}
        <div className="section-title">🖥 System Monitor</div>
        <div className="system-grid">
          <div className="system-item">
            <div className="label">CPU</div>
            <div className="value">{system.cpuCores || '?'} cores</div>
            <div className="label" style={{ marginTop: 4 }}>{(system.cpuModel || '').split('@')[0]?.trim()}</div>
          </div>
          <div className="system-item">
            <div className="label">Memory</div>
            <div className="value" style={{ color: (system.memUsedPercent || 0) > 80 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {system.memUsedPercent || 0}% used
            </div>
            <div className="label" style={{ marginTop: 4 }}>
              {formatBytes(system.memFree)} free / {formatBytes(system.memTotal)}
            </div>
          </div>
          <div className="system-item">
            <div className="label">Server</div>
            <div className="value">PID {system.serverPid || '?'}</div>
            <div className="label" style={{ marginTop: 4 }}>
              Node {system.nodeVersion} • {system.serverMemMB || '?'} MB RSS
            </div>
          </div>
        </div>
      </main>

      {/* Detail Panel */}
      {selectedAgent && (
        <div className="detail-overlay" onClick={() => setSelectedAgent(null)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <h2>{selectedAgentData?.name || selectedAgent}</h2>
              <button className="close-btn" onClick={() => setSelectedAgent(null)}>✕</button>
            </div>
            <div className="detail-body">
              {/* Controls */}
              <div className="agent-actions">
                {selectedAgentData?.status === 'running' ? (
                  <button className="btn btn-stop" onClick={() => stopAgent(selectedAgent)}>⏹ Stop Agent</button>
                ) : (
                  <button className="btn btn-start" onClick={() => startAgent(selectedAgent)}>▶ Start Agent</button>
                )}
              </div>

              {/* Agent Info */}
              <div className="detail-section">
                <h3>Agent Info</h3>
                <div className="system-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <div className="system-item">
                    <div className="label">Status</div>
                    <div className="value" style={{ color: selectedAgentData?.status === 'running' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {selectedAgentData?.status || '—'}
                    </div>
                  </div>
                  <div className="system-item">
                    <div className="label">PID</div>
                    <div className="value">{selectedAgentData?.pid || '—'}</div>
                  </div>
                  <div className="system-item">
                    <div className="label">Total Runs</div>
                    <div className="value">{selectedAgentData?.totalRuns || 0}</div>
                  </div>
                  <div className="system-item">
                    <div className="label">Last Exit Code</div>
                    <div className="value" style={{
                      color: selectedAgentData?.lastExitCode === 0 ? 'var(--accent-green)' :
                             selectedAgentData?.lastExitCode === null ? 'var(--text-muted)' : 'var(--accent-red)'
                    }}>
                      {selectedAgentData?.lastExitCode ?? '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Logs */}
              <div className="detail-section">
                <h3>Live Logs</h3>
                <div className="terminal">
                  {logs.length === 0 ? (
                    <div className="empty-state">No logs yet. Start the agent to see output.</div>
                  ) : (
                    logs.map((line, i) => (
                      <div key={i} className={`log-line ${classifyLog(line)}`}>{line}</div>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>

              {/* Output Files */}
              <div className="detail-section">
                <h3>Output Files ({outputs.length})</h3>
                {outputs.length === 0 ? (
                  <div className="empty-state">No output files yet. Run the agent to generate data.</div>
                ) : (
                  <div className="file-list">
                    {outputs.map((file, i) => (
                      <div key={i} className="file-item" onClick={() => viewFile(selectedAgent, file.name)}>
                        <span className="file-name">📄 {file.name}</span>
                        <span className="file-meta">{formatBytes(file.sizeBytes)} • {formatTime(file.modifiedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* File Content Viewer */}
              {viewingFile && (
                <div className="detail-section">
                  <h3>📄 {viewingFile.name}</h3>
                  <div className="file-viewer">{viewingFile.content}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
