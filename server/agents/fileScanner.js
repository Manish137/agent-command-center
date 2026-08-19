/**
 * File Scanner & Hasher Agent — REAL
 * Scans actual directories on disk, computes SHA-256 checksums,
 * and generates a cryptographic verification manifest.
 * 
 * This is NOT a mock. It reads real files and computes real hashes.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const OUTPUT_DIR = process.env.AGENT_OUTPUT_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), '../../output/scans');
const SCAN_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '__pycache__', '.DS_Store', 'downloads']);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max per file

function getAllFiles(dir, files = [], depth = 0) {
  if (depth > 8) return files; // Limit recursion depth

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        getAllFiles(fullPath, files, depth + 1);
      } else if (entry.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size <= MAX_FILE_SIZE && stats.size > 0) {
            files.push({ path: fullPath, size: stats.size, modified: stats.mtime.toISOString() });
          }
        } catch (e) {
          // Skip inaccessible files
        }
      }
    }
  } catch (e) {
    // Skip inaccessible directories
  }
  return files;
}

function hashFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

async function run() {
  console.log('🚀 File Scanner & Hasher Agent started');
  console.log(`   Scan root: ${SCAN_ROOT}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log('');

  // Phase 1: Discover files
  console.log('📂 Phase 1: Scanning directory tree...');
  const files = getAllFiles(SCAN_ROOT);
  console.log(`   Found ${files.length} files`);

  // Phase 2: Compute hashes
  console.log('\n🔐 Phase 2: Computing SHA-256 checksums...');
  const manifest = [];
  let totalBytes = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = path.relative(SCAN_ROOT, file.path);

    try {
      const hash = hashFile(file.path);
      totalBytes += file.size;

      manifest.push({
        file: relPath,
        sizeBytes: file.size,
        sizeHuman: formatBytes(file.size),
        sha256: hash,
        modified: file.modified,
        status: 'VERIFIED',
      });

      // Log progress every 20 files
      if ((i + 1) % 20 === 0 || i === files.length - 1) {
        const pct = Math.round(((i + 1) / files.length) * 100);
        console.log(`   [${pct}%] Hashed ${i + 1}/${files.length} files (${formatBytes(totalBytes)} processed)`);
      }
    } catch (err) {
      errors++;
      manifest.push({
        file: relPath,
        sizeBytes: file.size,
        sha256: null,
        status: 'ERROR',
        error: err.message,
      });
    }
  }

  // Phase 3: Generate report
  console.log('\n📊 Phase 3: Generating manifest...');

  const report = {
    scanDate: new Date().toISOString(),
    scanRoot: SCAN_ROOT,
    totalFiles: manifest.length,
    totalBytes,
    totalBytesHuman: formatBytes(totalBytes),
    errors,
    verified: manifest.filter(m => m.status === 'VERIFIED').length,
    files: manifest,
  };

  const filename = `scan_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`\n✅ Scan Complete!`);
  console.log(`   Files scanned: ${manifest.length}`);
  console.log(`   Total size: ${formatBytes(totalBytes)}`);
  console.log(`   Verified: ${report.verified}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Manifest saved: ${filename}`);
  console.log('\n🏁 File Scanner Agent finished');
}

run().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
