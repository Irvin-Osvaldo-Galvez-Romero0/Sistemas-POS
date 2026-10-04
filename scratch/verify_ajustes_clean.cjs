const WebSocket = require('ws');
const { execSync } = require('child_process');

async function main() {
  const adb = 'C:\\Users\\User\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
  const pid = execSync(`"${adb}" shell pidof com.pos.abarrotes`).toString().trim();
  execSync(`"${adb}" forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

  const resp = await fetch('http://127.0.0.1:9222/json');
  const pages = await resp.json();
  const target = pages.find(p => p.type === 'page');

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  ws.on('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    // Try entering 9999 if login modal is up, then click Ajustes
    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (function() {
            const b9 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '9');
            if (b9) {
              b9.click(); setTimeout(() => b9.click(), 70); setTimeout(() => b9.click(), 140); setTimeout(() => b9.click(), 210);
            }
            setTimeout(() => {
              const ajustesBtn = document.getElementById('nav-btn-ajustes');
              if (ajustesBtn) ajustesBtn.click();
            }, 600);
            return 'PIN / Navigated to Ajustes';
          })()
        `,
        returnByValue: true
      }
    }));
  });

  ws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.id === 2) {
      console.log('EVAL RESULT:', m.result?.result?.value);
      setTimeout(() => {
        ws.close();
        process.exit(0);
      }, 1500);
    }
  });

  setTimeout(() => { ws.close(); process.exit(0); }, 5000);
}

main().catch(console.error);
