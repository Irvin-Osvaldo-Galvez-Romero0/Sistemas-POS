const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\23c97829-e26e-4ade-8391-12c169de2b6c';
  const profileDir = path.join(artifactDir, 'chrome-lh-profile');
  const reportJson = path.join(artifactDir, 'lighthouse_report.json');
  const reportHtml = path.join(artifactDir, 'lighthouse_report.html');

  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  console.log('[1/4] Spawning dedicated Chrome headless on port 9444...');
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless',
    '--remote-debugging-port=9444',
    '--remote-allow-origins=*',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=' + profileDir,
    'http://127.0.0.1:3051'
  ]);

  // Wait for DevTools port to open
  let connected = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://127.0.0.1:9444/json');
      if (res.ok) {
        connected = true;
        break;
      }
    } catch (_) {}
  }

  if (!connected) {
    console.error('Failed to connect to Chrome on port 9444');
    chromeProc.kill();
    process.exit(1);
  }
  console.log('[2/4] Chrome CDP port 9444 is healthy and accepting connections.');

  console.log('[3/4] Running Lighthouse audit on http://127.0.0.1:3051 via port 9444...');
  const lh = spawn('npx.cmd', [
    'lighthouse',
    'http://127.0.0.1:3051',
    '--port=9444',
    '--output=json,html',
    '--output-path=' + path.join(artifactDir, 'lighthouse_report'),
    '--chrome-flags=""',
    '--quiet'
  ], { shell: true });

  lh.stdout.on('data', d => console.log('[LH STDOUT]', d.toString().trim()));
  lh.stderr.on('data', d => console.log('[LH STDERR]', d.toString().trim()));

  await new Promise((resolve) => {
    lh.on('close', (code) => {
      console.log('[4/4] Lighthouse exited with code:', code);
      resolve();
    });
  });

  chromeProc.kill();

  // Parse report if exists
  const targetReport = path.join(artifactDir, 'lighthouse_report.report.json');
  const fallbackReport = path.join(artifactDir, 'lighthouse_report.json');
  const actualPath = fs.existsSync(targetReport) ? targetReport : (fs.existsSync(fallbackReport) ? fallbackReport : null);

  if (actualPath) {
    const raw = JSON.parse(fs.readFileSync(actualPath, 'utf8'));
    const categories = raw.categories || {};
    const audits = raw.audits || {};

    const summary = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
      pwa: Math.round((categories.pwa?.score || 0) * 100),
      coreWebVitals: {
        FCP: audits['first-contentful-paint']?.displayValue,
        LCP: audits['largest-contentful-paint']?.displayValue,
        TBT: audits['total-blocking-time']?.displayValue,
        CLS: audits['cumulative-layout-shift']?.displayValue,
        SpeedIndex: audits['speed-index']?.displayValue,
      }
    };

    fs.writeFileSync(path.join(artifactDir, 'lighthouse_summary.json'), JSON.stringify(summary, null, 2));
    console.log('\n================ LIGHTHOUSE AUDIT SCORES ================');
    console.log(`Performance:    ${summary.performance}/100`);
    console.log(`Accessibility:  ${summary.accessibility}/100`);
    console.log(`Best Practices: ${summary.bestPractices}/100`);
    console.log(`SEO:            ${summary.seo}/100`);
    console.log('---------------- Core Web Vitals ----------------');
    console.log(`FCP:        ${summary.coreWebVitals.FCP}`);
    console.log(`LCP:        ${summary.coreWebVitals.LCP}`);
    console.log(`TBT (INP):  ${summary.coreWebVitals.TBT}`);
    console.log(`CLS:        ${summary.coreWebVitals.CLS}`);
    console.log(`SpeedIndex: ${summary.coreWebVitals.SpeedIndex}`);
    console.log('=========================================================\n');
  } else {
    console.log('No report file found at', targetReport, 'or', fallbackReport);
  }
}

main().catch(console.error);
