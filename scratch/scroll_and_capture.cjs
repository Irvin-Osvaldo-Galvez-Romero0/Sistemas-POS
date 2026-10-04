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
    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (function() {
            const container = document.getElementById('ajustes-view-container') || document.querySelector('div[class*="overflow-y-auto"]');
            if (container) {
              container.scrollTop = 800;
              return 'Scrolled container by 800px';
            }
            window.scrollBy(0, 800);
            return 'Scrolled window by 800px';
          })()
        `,
        returnByValue: true
      }
    }));
  });

  ws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.id === 2) {
      console.log('SCROLL RESULT:', m.result?.result?.value);
      setTimeout(() => {
        ws.close();
        process.exit(0);
      }, 500);
    }
  });

  setTimeout(() => { ws.close(); process.exit(0); }, 4000);
}

main().catch(console.error);
