/**
 * Job Scraper Agent — REAL
 * Fetches live job listings from RemoteOK API.
 * Saves results as JSON to the output directory.
 * 
 * This is NOT a mock. It makes real HTTP requests to real APIs.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = process.env.AGENT_OUTPUT_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), '../../output/jobs');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AgentCommandCenter/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('🚀 Job Scraper Agent started');
  console.log(`   Output directory: ${OUTPUT_DIR}`);
  console.log('');

  // ── Source 1: RemoteOK ───────────────────────────────────────
  console.log('📡 Fetching from RemoteOK API...');
  try {
    const raw = await fetchJSON('https://remoteok.com/api');
    const jobs = (Array.isArray(raw) ? raw.slice(1) : [])
      .filter(j => j.position && j.company)
      .slice(0, 25)
      .map(j => ({
        title: j.position,
        company: j.company,
        location: j.location || 'Remote',
        salary: j.salary_min ? `$${j.salary_min.toLocaleString()} - $${j.salary_max?.toLocaleString() || '?'}` : 'Not listed',
        tags: j.tags || [],
        url: j.url ? `https://remoteok.com${j.url}` : null,
        datePosted: j.date || 'Unknown',
        source: 'RemoteOK',
        description: j.description ? j.description.replace(/<[^>]*>/g, '').substring(0, 300) : '',
      }));

    console.log(`   ✅ Found ${jobs.length} live listings from RemoteOK`);

    // Log each job
    jobs.forEach((job, i) => {
      console.log(`   ${i + 1}. ${job.title} @ ${job.company} | ${job.salary}`);
    });

    // Save to disk
    const filename = `jobs_remoteok_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2));
    console.log(`\n📁 Saved ${jobs.length} jobs to: ${filename}`);

  } catch (err) {
    console.error(`   ❌ RemoteOK fetch failed: ${err.message}`);
  }

  // ── Source 2: GitHub Jobs (HN Who's Hiring) ──────────────────
  console.log('\n📡 Fetching from HackerNews jobs API...');
  try {
    const hnRaw = await fetchJSON('https://hacker-news.firebaseio.com/v0/jobstories.json');
    const jobIds = (Array.isArray(hnRaw) ? hnRaw : []).slice(0, 15);

    const hnJobs = [];
    for (const id of jobIds) {
      try {
        const item = await fetchJSON(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        if (item && item.title) {
          hnJobs.push({
            title: item.title,
            company: item.title.split('(')[0]?.trim() || 'Unknown',
            url: item.url || `https://news.ycombinator.com/item?id=${id}`,
            datePosted: item.time ? new Date(item.time * 1000).toISOString() : 'Unknown',
            source: 'HackerNews',
            description: item.text ? item.text.replace(/<[^>]*>/g, '').substring(0, 300) : '',
          });
        }
      } catch (e) {
        // Skip individual failures
      }
    }

    console.log(`   ✅ Found ${hnJobs.length} listings from HackerNews`);

    hnJobs.forEach((job, i) => {
      console.log(`   ${i + 1}. ${job.title}`);
    });

    const hnFilename = `jobs_hackernews_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const hnPath = path.join(OUTPUT_DIR, hnFilename);
    fs.writeFileSync(hnPath, JSON.stringify(hnJobs, null, 2));
    console.log(`\n📁 Saved ${hnJobs.length} jobs to: ${hnFilename}`);

  } catch (err) {
    console.error(`   ❌ HackerNews fetch failed: ${err.message}`);
  }

  console.log('\n🏁 Job Scraper Agent finished');
}

run().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
