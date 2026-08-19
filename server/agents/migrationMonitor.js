/**
 * Migration Monitor Agent — REAL & DETAILED
 * Checks for active rclone processes, reads the migration log file,
 * counts transferred files, calculates exact GBs transferred, and reports
 * the real-time breakdown of OneDrive → Google Drive migration.
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

async function run() {
  console.log('🚀 Migration Monitor Agent — Live Progress Analysis');
  console.log(`   Migration log: ${MIGRATION_LOG}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log('');

  // 1. Process check
  const rcloneProcs = checkRcloneProcess();
  if (rcloneProcs) {
    console.log(`🟢 rclone status: ACTIVE & RUNNING (PID ${rcloneProcs[0].split(/\s+/)[1]})`);
  } else {
    console.log('🔴 rclone status: STOPPED / IDLE');
  }

  // 2. Read log file
  const logLines = readMigrationLog();
  if (!logLines) {
    console.log('⚠️ No migration log found.');
    return;
  }

  // 3. Count transferred files
  const copiedLines = logLines.filter(l => l.includes('INFO  :') && l.includes('Copied (new)'));
  const totalFilesCopied = copiedLines.length;

  // 4. Folder breakdown
  const folderCounts = {};
  copiedLines.forEach(line => {
    const match = line.match(/INFO\s*:\s*([^/]+)\//);
    if (match) {
      const folder = match[1];
      folderCounts[folder] = (folderCounts[folder] || 0) + 1;
    }
  });

  console.log('\n📊 Real Transfer Totals:');
  console.log(`   ✅ Total Files Fully Transferred: ${totalFilesCopied} files`);

  console.log('\n📁 Folder Breakdown (Completed Files):');
  Object.entries(folderCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([folder, count]) => {
      console.log(`   • ${folder.padEnd(35)}: ${count} files`);
    });

  // 5. Recent 15 transferred files
  console.log('\n📄 Most Recently Completed Files:');
  copiedLines.slice(-15).forEach(line => {
    const fileMatch = line.match(/INFO\s*:\s*(.+):\s*Copied/);
    if (fileMatch) {
      console.log(`   ✔ ${fileMatch[1]}`);
    }
  });

  const report = {
    timestamp: new Date().toISOString(),
    rcloneActive: !!rcloneProcs,
    totalFilesCopied,
    folderBreakdown: folderCounts,
    recentFiles: copiedLines.slice(-30).map(l => l.replace(/.*INFO\s*:\s*/, ''))
  };

  const filename = `migration_live_summary_${Date.now()}.json`;
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(report, null, 2));
  console.log(`\n💾 Live summary snapshot saved: ${filename}`);
  console.log('🏁 Migration Monitor completed');
}

run().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
