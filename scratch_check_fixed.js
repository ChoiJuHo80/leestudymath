import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

console.log('Starting Headless Chrome...');
const chromeProcess = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9227',
    '--user-data-dir=C:\\Users\\Administrator\\AppData\\Local\\Temp\\chrome_profile_consult_diag',
    'about:blank'
]);

setTimeout(async () => {
    try {
        console.log('Connecting to Chrome debugger...');
        http.get('http://127.0.0.1:9227/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const targets = JSON.parse(data);
                const pageTarget = targets.find(t => t.type === 'page');
                if (!pageTarget) {
                    console.error('No page target found!');
                    chromeProcess.kill();
                    process.exit(1);
                }
                
                const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
                ws.on('open', () => {
                    console.log('Connected! Enabling console and navigating to localhost:5173...');
                    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
                    ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
                    ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
                    
                    ws.send(JSON.stringify({
                        id: 4,
                        method: 'Page.navigate',
                        params: { url: 'http://localhost:5173/' }
                    }));
                });
                
                ws.on('message', (message) => {
                    const msg = JSON.parse(message);
                    if (msg.method === 'Runtime.consoleAPICalled') {
                        const args = msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || JSON.stringify(a))).join(' ');
                        console.log(`[BROWSER CONSOLE] ${args}`);
                    } else if (msg.method === 'Runtime.exceptionThrown') {
                        console.error(`[BROWSER EXCEPTION]`, msg.params.exceptionDetails.exception.description || msg.params.exceptionDetails.text);
                    }
                });
                
                // Let the page load, then click the consult button
                setTimeout(() => {
                    console.log('Clicking "상담 예약 문의" button...');
                    ws.send(JSON.stringify({
                        id: 10,
                        method: 'Runtime.evaluate',
                        params: {
                            expression: `(() => {
                                const btn = document.getElementById('btn-open-consult-modal');
                                if (!btn) return 'btn-open-consult-modal not found!';
                                btn.click();
                                return 'Clicked consult button';
                            })()`
                        }
                    }));
                }, 3000);

                setTimeout(() => {
                    console.log('Checking modal classes...');
                    ws.send(JSON.stringify({
                        id: 11,
                        method: 'Runtime.evaluate',
                        params: {
                            expression: `(() => {
                                const modal = document.getElementById('consult-inquiry-modal');
                                if (!modal) return 'consult-inquiry-modal not found!';
                                return 'Modal class list: ' + modal.className;
                            })()`
                        }
                    }));
                }, 5000);
                
                ws.on('message', (message) => {
                    const msg = JSON.parse(message);
                    if (msg.id === 10 || msg.id === 11) {
                        console.log(`[EVAL RESULT ${msg.id}]`, msg.result.result.value);
                    }
                });

                setTimeout(() => {
                    console.log('Finished diagnostics. Killing Chrome...');
                    chromeProcess.kill();
                    ws.close();
                    process.exit(0);
                }, 7000);
            });
        });
    } catch (e) {
        console.error('Error during setup:', e);
        chromeProcess.kill();
        process.exit(1);
    }
}, 2000);
