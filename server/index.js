import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static assets in production mode
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ── Directories ──────────────────────────────────────────────
const LOGS_DIR = path.join(__dirname, '../logs');
const OUTPUT_DIR = path.join(__dirname, '../output');
[LOGS_DIR, OUTPUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Agent Registry ───────────────────────────────────────────
// Each agent maps to a REAL command that actually does something.
// No mock data. No fake progress bars. No setTimeout pretending to work.

const SCRATCH_DIR = path.resolve(__dirname, '../../');

const agentRegistry = {
  'job-scraper': {
    name: 'Job Scraper',
    description: 'Scrapes live remote job listings from RemoteOK API and saves results to disk.',
    category: 'Career',
    command: 'node',
    args: [path.join(__dirname, 'agents/jobScraper.js')],
    cwd: __dirname,
    logFile: path.join(LOGS_DIR, 'job-scraper.log'),
    outputDir: path.join(OUTPUT_DIR, 'jobs'),
  },
  'file-scanner': {
    name: 'File Scanner & Hasher',
    description: 'Scans local project directories, computes SHA-256 checksums, and generates a manifest.',
    category: 'Infrastructure',
    command: 'node',
    args: [path.join(__dirname, 'agents/fileScanner.js')],
    cwd: __dirname,
    logFile: path.join(LOGS_DIR, 'file-scanner.log'),
    outputDir: path.join(OUTPUT_DIR, 'scans'),
  },
  'appointment-booking': {
    name: 'Appointment Booking Server',
    description: 'Runs the appointment booking HTTP server with real slot management and persistence.',
    category: 'Automation',
    command: 'node',
    args: [path.join(SCRATCH_DIR, 'appointment-booking/src/server.js')],
    cwd: path.join(SCRATCH_DIR, 'appointment-booking'),
    logFile: path.join(LOGS_DIR, 'appointment-booking.log'),
    outputDir: path.join(SCRATCH_DIR, 'appointment-booking/data'),
  },
  'migration-monitor': {
    name: 'OneDrive Migration Monitor',
    description: 'Monitors the active rclone OneDrive→GDrive migration and reports progress.',
    category: 'Infrastructure',
    command: 'node',
    args: [path.join(__dirname, 'agents/migrationMonitor.js')],
    cwd: __dirname,
    logFile: path.join(LOGS_DIR, 'migration-monitor.log'),
    outputDir: path.join(OUTPUT_DIR, 'migration'),
  },
  'universal-wisdom': {
    name: 'Universal Wisdom Server',
    description: '35 wisdom traditions & 3,780 universal principles interactive platform (Port 3005).',
    category: 'Spiritual Tech',
    command: 'npx',
    args: ['tsx', 'server/index.ts'],
    cwd: path.join(SCRATCH_DIR, 'universal-wisdom'),
    logFile: path.join(LOGS_DIR, 'universal-wisdom.log'),
    outputDir: path.join(SCRATCH_DIR, 'universal-wisdom/server/data'),
  },
  'wisdom-curator': {
    name: 'Wisdom Curator & Growth Agent',
    description: 'Audits 35 traditions, discovers cross-philosophical links, and generates daily marketing assets.',
    category: 'Spiritual Tech',
    command: 'node',
    args: [path.join(__dirname, 'agents/wisdomCurator.js')],
    cwd: __dirname,
    logFile: path.join(LOGS_DIR, 'wisdom-curator.log'),
    outputDir: path.join(OUTPUT_DIR, 'wisdom'),
  },
};

// ── Runtime State ────────────────────────────────────────────
// Tracks actual running processes — no fake data.
const runningProcesses = {}; // agentId -> { process, pid, startedAt }
const agentHistory = {};     // agentId -> { lastRun, totalRuns, lastExitCode }

// Initialize history
Object.keys(agentRegistry).forEach(id => {
  agentHistory[id] = { lastRun: null, totalRuns: 0, lastExitCode: null };
});

// In-memory log buffer (last 500 lines per agent for fast access)
const logBuffers = {}; // agentId -> string[]
const MAX_LOG_LINES = 500;

function appendLog(agentId, line) {
  if (!logBuffers[agentId]) logBuffers[agentId] = [];
  const timestamped = `[${new Date().toISOString()}] ${line}`;
  logBuffers[agentId].push(timestamped);
  if (logBuffers[agentId].length > MAX_LOG_LINES) {
    logBuffers[agentId].shift();
  }
  // Also write to log file
  const agent = agentRegistry[agentId];
  if (agent) {
    fs.appendFileSync(agent.logFile, timestamped + '\n');
  }
}

// ── API Routes ───────────────────────────────────────────────

// GET /api/agents — List all agents with real status
app.get('/api/agents', (req, res) => {
  const agents = Object.entries(agentRegistry).map(([id, config]) => {
    const proc = runningProcesses[id];
    const history = agentHistory[id] || {};
    return {
      id,
      name: config.name,
      description: config.description,
      category: config.category,
      status: proc ? 'running' : 'stopped',
      pid: proc ? proc.pid : null,
      startedAt: proc ? proc.startedAt : null,
      uptime: proc ? Math.round((Date.now() - proc.startedAt) / 1000) : 0,
      lastRun: history.lastRun,
      totalRuns: history.totalRuns,
      lastExitCode: history.lastExitCode,
      logFile: config.logFile,
      outputDir: config.outputDir,
    };
  });
  res.json({ success: true, agents });
});

// POST /api/agents/:id/start — Start an agent (spawn real process)
app.post('/api/agents/:id/start', (req, res) => {
  const { id } = req.params;
  const agent = agentRegistry[id];
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  if (runningProcesses[id]) {
    return res.status(409).json({ success: false, error: 'Agent is already running', pid: runningProcesses[id].pid });
  }

  // Ensure output directory exists
  if (!fs.existsSync(agent.outputDir)) {
    fs.mkdirSync(agent.outputDir, { recursive: true });
  }

  // Clear previous log
  fs.writeFileSync(agent.logFile, '');
  logBuffers[id] = [];

  appendLog(id, `▶ STARTING: ${agent.name}`);
  appendLog(id, `  Command: ${agent.command} ${agent.args.join(' ')}`);
  appendLog(id, `  CWD: ${agent.cwd}`);
  appendLog(id, `  PID: pending...`);

  try {
    const child = spawn(agent.command, agent.args, {
      cwd: agent.cwd,
      env: { ...process.env, AGENT_OUTPUT_DIR: agent.outputDir, AGENT_LOG_FILE: agent.logFile },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const startedAt = Date.now();

    runningProcesses[id] = {
      process: child,
      pid: child.pid,
      startedAt,
    };

    appendLog(id, `  PID: ${child.pid} — Process spawned successfully`);

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => appendLog(id, `[stdout] ${line}`));
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => appendLog(id, `[stderr] ${line}`));
    });

    child.on('close', (code) => {
      appendLog(id, `⏹ EXITED: ${agent.name} — exit code ${code}`);
      delete runningProcesses[id];
      agentHistory[id].lastRun = new Date().toISOString();
      agentHistory[id].totalRuns += 1;
      agentHistory[id].lastExitCode = code;
    });

    child.on('error', (err) => {
      appendLog(id, `❌ ERROR: ${err.message}`);
      delete runningProcesses[id];
    });

    res.json({ success: true, pid: child.pid, message: `${agent.name} started` });
  } catch (err) {
    appendLog(id, `❌ FAILED TO START: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/agents/:id/stop — Stop an agent (kill real process)
app.post('/api/agents/:id/stop', (req, res) => {
  const { id } = req.params;
  const proc = runningProcesses[id];
  if (!proc) return res.status(404).json({ success: false, error: 'Agent is not running' });

  appendLog(id, `⏹ STOPPING: Sending SIGTERM to PID ${proc.pid}`);
  proc.process.kill('SIGTERM');

  // Force kill after 5 seconds
  setTimeout(() => {
    if (runningProcesses[id]) {
      appendLog(id, `🔪 FORCE KILLING: PID ${proc.pid}`);
      proc.process.kill('SIGKILL');
      delete runningProcesses[id];
    }
  }, 5000);

  res.json({ success: true, message: 'Stop signal sent' });
});

// GET /api/agents/:id/logs — Get real log output
app.get('/api/agents/:id/logs', (req, res) => {
  const { id } = req.params;
  const lines = parseInt(req.query.lines) || 100;
  const buffer = logBuffers[id] || [];
  res.json({ success: true, logs: buffer.slice(-lines) });
});

// GET /api/agents/:id/outputs — List real output files
app.get('/api/agents/:id/outputs', (req, res) => {
  const { id } = req.params;
  const agent = agentRegistry[id];
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  try {
    if (!fs.existsSync(agent.outputDir)) {
      return res.json({ success: true, files: [] });
    }
    const files = fs.readdirSync(agent.outputDir)
      .filter(f => !f.startsWith('.'))
      .map(f => {
        const fp = path.join(agent.outputDir, f);
        const stats = fs.statSync(fp);
        return {
          name: f,
          path: fp,
          sizeBytes: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/agents/:id/output-file?name=... — Read a specific output file
app.get('/api/agents/:id/output-file', (req, res) => {
  const { id } = req.params;
  const { name } = req.query;
  const agent = agentRegistry[id];
  if (!agent || !name) return res.status(400).json({ success: false, error: 'Missing parameters' });

  const fp = path.join(agent.outputDir, path.basename(name));
  if (!fs.existsSync(fp)) return res.status(404).json({ success: false, error: 'File not found' });

  try {
    const content = fs.readFileSync(fp, 'utf8');
    res.json({ success: true, name, content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/system — Real system metrics
app.get('/api/system', (req, res) => {
  const cpus = os.cpus();
  const freeMem = os.freemem();
  const totalMem = os.totalmem();

  res.json({
    success: true,
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuCores: cpus.length,
      memTotal: totalMem,
      memFree: freeMem,
      memUsedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
      uptimeSeconds: Math.round(os.uptime()),
      nodeVersion: process.version,
      serverPid: process.pid,
      serverMemMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    },
  });
});

// GET /api/summary — Dashboard summary with real data only
app.get('/api/summary', (req, res) => {
  const totalAgents = Object.keys(agentRegistry).length;
  const runningAgents = Object.keys(runningProcesses).length;
  const totalRuns = Object.values(agentHistory).reduce((sum, h) => sum + h.totalRuns, 0);

  // Count real output files
  let totalOutputFiles = 0;
  Object.values(agentRegistry).forEach(agent => {
    try {
      if (fs.existsSync(agent.outputDir)) {
        totalOutputFiles += fs.readdirSync(agent.outputDir).filter(f => !f.startsWith('.')).length;
      }
    } catch (e) {}
  });

  res.json({
    success: true,
    summary: {
      totalAgents,
      runningAgents,
      totalRuns,
      totalOutputFiles,
    },
  });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('Agent Command Center Backend Running. Start frontend with: npm run client');
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down — killing all agent processes...');
  Object.entries(runningProcesses).forEach(([id, proc]) => {
    console.log(`  Killing ${id} (PID ${proc.pid})`);
    proc.process.kill('SIGKILL');
  });
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`⚡ Agent Command Center — Real Engine`);
  console.log(`   Server: http://localhost:${PORT}`);
  console.log(`   Agents: ${Object.keys(agentRegistry).length} registered`);
  console.log(`   Logs:   ${LOGS_DIR}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
});
