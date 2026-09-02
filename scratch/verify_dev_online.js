const { spawn } = require('child_process');

async function checkDevBrowser() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = 'C:\\Users\\samiu\\AppData\\Local\\Temp\\edge_dev_online_' + Date.now();

  const proc = spawn(edgePath, [
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-port=9234',
    '--headless=new',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const list = await (await fetch('http://127.0.0.1:9234/json')).json();
  const page = list.find(t => t.type === 'page' && t.url.includes('3000'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise(r => ws.onopen = r);

  let msgId = 0;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++msgId;
      const handler = (e) => {
        const data = JSON.parse(e.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 2500));

  const result = await send('Runtime.evaluate', {
    expression: `(() => ({
      title: document.title,
      headerLogo: Boolean(document.querySelector('header img')),
      h1Text: document.querySelector('h1')?.innerText,
      jukeboxPresent: Boolean(document.querySelector('button[aria-label="Play"], button[aria-label="Pause"]')),
      bodyVisible: document.body.offsetWidth > 0 && document.body.offsetHeight > 0
    }))()`,
    returnByValue: true
  });

  console.log('BROWSER VERIFICATION RESULT:', result.result?.value || result);

  ws.close();
  proc.kill();
}

checkDevBrowser().catch(err => {
  console.error(err);
  process.exit(1);
});
