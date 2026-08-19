import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Briefcase, Terminal, Cpu, RefreshCw, Layers, Sparkles, FolderDown, FileText } from 'lucide-react';
import MetricsOverview from './components/MetricsOverview';
import FleetGrid from './components/FleetGrid';
import JobHunterTab from './components/JobHunterTab';
import LogTerminal from './components/LogTerminal';

export default function App() {
  const [activeTab, setActiveTab] = useState('fleet'); // fleet, jobs, logs, outputs
  const [agents, setAgents] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [outputFiles, setOutputFiles] = useState([]);

  const fetchData = async () => {
    try {
      const [agentsRes, jobsRes, logsRes, metricsRes, statsRes, outputsRes] = await Promise.all([
        fetch('/api/agents').then(r => r.json()),
        fetch('/api/jobs').then(r => r.json()),
        fetch('/api/logs').then(r => r.json()),
        fetch('/api/metrics').then(r => r.json()),
        fetch('/api/system-stats').then(r => r.json()),
        fetch('/api/outputs').then(r => r.json())
      ]);

      if (agentsRes.success) setAgents(agentsRes.agents);
      if (jobsRes.success) setJobs(jobsRes.jobs);
      if (logsRes.success) setLogs(logsRes.logs);
      if (metricsRes.success) setMetrics(metricsRes.metrics);
      if (statsRes.success) setSystemStats(statsRes.stats);
      if (outputsRes.success) setOutputFiles(outputsRes.files);
    } catch (err) {
      console.error('Error connecting to local orchestrator API:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000); // Fast 1-second live telemetry polling
    return () => clearInterval(interval);
  }, []);

  const handleAgentAction = async (id, action) => {
    try {
      await fetch(`/api/agents/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      fetchData();
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  const handleSearchJobs = async (query, location, minSalary) => {
    try {
      await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location, minSalary })
      });
      fetchData();
    } catch (err) {
      console.error('Search trigger failed:', err);
    }
  };

  const handleApplyJob = async (jobId) => {
    try {
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      }).then(r => r.json());
      fetchData();
      return res;
    } catch (err) {
      console.error('Apply trigger failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', padding: '24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px', paddingLeft: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Cpu size={22} />
            </div>
            <div>
              <h1 className="heading-font" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>ApexAgent</h1>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '1px' }}>REAL ENGINE</span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button 
              className="btn" 
              style={{ justifyContent: 'flex-start', background: activeTab === 'fleet' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: activeTab === 'fleet' ? 'var(--text-main)' : 'var(--text-muted)', border: activeTab === 'fleet' ? '1px solid var(--border-glow)' : '1px solid transparent', padding: '12px 16px' }}
              onClick={() => setActiveTab('fleet')}
            >
              <LayoutDashboard size={18} style={{ color: activeTab === 'fleet' ? 'var(--accent-primary)' : 'inherit' }} />
              Agent Fleet Matrix
            </button>

            <button 
              className="btn" 
              style={{ justifyContent: 'flex-start', background: activeTab === 'jobs' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: activeTab === 'jobs' ? 'var(--text-main)' : 'var(--text-muted)', border: activeTab === 'jobs' ? '1px solid var(--border-glow)' : '1px solid transparent', padding: '12px 16px' }}
              onClick={() => setActiveTab('jobs')}
            >
              <Briefcase size={18} style={{ color: activeTab === 'jobs' ? 'var(--accent-cyan)' : 'inherit' }} />
              Job Hunt & Apply Hub
            </button>

            <button 
              className="btn" 
              style={{ justifyContent: 'flex-start', background: activeTab === 'logs' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: activeTab === 'logs' ? 'var(--text-main)' : 'var(--text-muted)', border: activeTab === 'logs' ? '1px solid var(--border-glow)' : '1px solid transparent', padding: '12px 16px' }}
              onClick={() => setActiveTab('logs')}
            >
              <Terminal size={18} style={{ color: activeTab === 'logs' ? 'var(--accent-emerald)' : 'inherit' }} />
              Live Process Telemetry
            </button>

            <button 
              className="btn" 
              style={{ justifyContent: 'flex-start', background: activeTab === 'outputs' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: activeTab === 'outputs' ? 'var(--text-main)' : 'var(--text-muted)', border: activeTab === 'outputs' ? '1px solid var(--border-glow)' : '1px solid transparent', padding: '12px 16px' }}
              onClick={() => setActiveTab('outputs')}
            >
              <FolderDown size={18} style={{ color: activeTab === 'outputs' ? 'var(--accent-amber)' : 'inherit' }} />
              Output Artifacts ({outputFiles.length})
            </button>
          </nav>
        </div>

        <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            Real Process Engine Active
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Native Node.js process & FS integration on Port 3001</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {/* Header Bar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 className="heading-font gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>
              {activeTab === 'fleet' && 'Agent Orchestration Fleet'}
              {activeTab === 'jobs' && 'Job Hunting & Application Suite'}
              {activeTab === 'logs' && 'Live Console Telemetry'}
              {activeTab === 'outputs' && 'Local Generated Output Artifacts'}
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Real-time process execution, SHA-256 checksum verification, and live web job scraping.
            </p>
          </div>

          <button className="btn btn-secondary" onClick={fetchData}>
            <RefreshCw size={16} /> Sync Process Telemetry
          </button>
        </header>

        {/* Telemetry Cards */}
        <MetricsOverview metrics={metrics} />

        {/* Tab Views */}
        {activeTab === 'fleet' && <FleetGrid agents={agents} onAgentAction={handleAgentAction} systemStats={systemStats} />}
        {activeTab === 'jobs' && <JobHunterTab jobs={jobs} onSearchJobs={handleSearchJobs} onApplyJob={handleApplyJob} />}
        {activeTab === 'logs' && <LogTerminal logs={logs} />}
        
        {activeTab === 'outputs' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 className="heading-font" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Generated Output Files on Local Disk</h3>
            {outputFiles.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No output files generated yet. Run the Cloud Data Migration Agent or Job Applier to create real manifest and markdown documents!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {outputFiles.map((file, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FileText style={{ color: 'var(--accent-cyan)' }} size={20} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{file.name}</div>
                        <div className="mono-font" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          Path: {file.path}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {(file.sizeBytes / 1024).toFixed(1)} KB | {file.createdAt}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
