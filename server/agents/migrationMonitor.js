/**
 * Migration Monitor Agent — REAL
 * Checks for active rclone processes and reads the migration log file
 * to report real progress on the OneDrive → Google Drive migration.
 * 
 * This is NOT a mock. It checks real process tables and reads real logs.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = process.env.AGENT_OUTPUT_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), '../../output/migration');
const MIGRATION_LOG = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../onedrive-to-gdrive-migration/migration.log');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function checkRcloneProcess() {
  try {
    const result = execSync('ps aux | grep "rclone copy" | grep -v grep', { encoding: 'utf8', timeout: 5000 });
    const lines = result.trim().split('\n').filter(l => l.trim());
    return lines.length > 0 ? lines : null;
  } catch (e) {
    return null;
  }
}

function readMigrationLog() {
  try {
    if (!fs.existsSync(MIGRATION_LOG)) return null;
    const content = fs.readFileSync(MIGRATION_LOG, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    return lines;
  } catch (e) {
    return null;
  }
}

function parseProgress(logLines) {
  if (!logLines || logLines.length === 0) return null;

  // Look for the most recent "Transferred:" line
  const stats = {};
  for (let i = logLines.length - 1; i >= Math.max(0, logLines.length - 100); i--) {
    const line = logLines[i];
    const transferMatch = line.match(/Transferred:\s+(\d+)\s*\/\s*(\d+)/);
    if (transferMatch && !stats.filesTransferred) {
      stats.filesTransferred = parseInt(transferMatch[1]);
      stats.filesTotal = parseInt(transferMatch[2]);
    }
    const sizeMatch = line.match(/Transferred:\s+([\d.]+)\s*(\w+)\s*\/\s*([\d.]+)\s*(\w+),\s*(\d+)%/);
    if (sizeMatch && !stats.bytesTransferred) {
      stats.bytesTransferred = `${sizeMatch[1]} ${sizeMatch[2]}`;
      stats.bytesTotal = `${sizeMatch[3]} ${sizeMatch[4]}`;
      stats.percentage = parseInt(sizeMatch[5]);
    }
    const speedMatch = line.match(/([\d.]+)\s*(MiB|GiB|KiB)\/s/);
    if (speedMatch && !stats.speed) {
      stats.speed = `${speedMatch[1]} ${speedMatch[2]}/s`;
    }
    const etaMatch = line.match(/ETA\s+([\dhms]+)/);
    if (etaMatch && !stats.eta) {
      stats.eta = etaMatch[1];
    }
    const errorMatch = line.match(/ERROR\s*:\s*(.+)/);
    if (errorMatch && !stats.lastError) {
      stats.lastError = errorMatch[1];
    }
  }

  return stats;
}

async function run() {
  console.log('🚀 Migration Monitor Agent started');
  console.log(`   Migration log: ${MIGRATION_LOG}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log('');

  // Check for active rclone process
  console.log('🔍 Checking for active rclone process...');
  const rcloneProcs = checkRcloneProcess();

  if (rcloneProcs) {
    console.log(`   ✅ rclone is RUNNING (${rcloneProcs.length} process(es))`);
    rcloneProcs.forEach(p => console.log(`      ${p.substring(0, 120)}`));
  } else {
    console.log('   ⚠️  No active rclone process found');
  }

  // Read and parse migration log
  console.log('\n📋 Reading migration log...');
  const logLines = readMigrationLog();

  if (!logLines) {
    console.log('   ⚠️  Migration log not found or empty');
    console.log(`   Expected at: ${MIGRATION_LOG}`);
  } else {
    console.log(`   Found ${logLines.length} log lines`);

    // Parse progress
    const progress = parseProgress(logLines);
    if (progress) {
      console.log('\n📊 Migration Progress:');
      if (progress.percentage !== undefined) console.log(`   Progress:  ${progress.percentage}%`);
      if (progress.bytesTransferred) console.log(`   Data:      ${progress.bytesTransferred} / ${progress.bytesTotal}`);
      if (progress.filesTransferred !== undefined) console.log(`   Files:     ${progress.filesTransferred} / ${progress.filesTotal}`);
      if (progress.speed) console.log(`   Speed:     ${progress.speed}`);
      if (progress.eta) console.log(`   ETA:       ${progress.eta}`);
      if (progress.lastError) console.log(`   ⚠️  Last error: ${progress.lastError}`);
    }

    // Show last 20 log lines
    console.log('\n📜 Recent log entries:');
    logLines.slice(-20).forEach(line => {
      console.log(`   ${line}`);
    });
  }

  // Save status report
  const report = {
    timestamp: new Date().toISOString(),
    rcloneActive: !!rcloneProcs,
    rcloneProcessCount: rcloneProcs ? rcloneProcs.length : 0,
    logFileExists: !!logLines,
    logLines: logLines ? logLines.length : 0,
    progress: logLines ? parseProgress(logLines) : null,
    recentLogs: logLines ? logLines.slice(-50) : [],
  };

  const filename = `migration_status_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n📁 Status report saved: ${filename}`);

  console.log('\n🏁 Migration Monitor Agent finished');
}

run().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
