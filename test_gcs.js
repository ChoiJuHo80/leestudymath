import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

console.log('Starting Chrome pointing to about:blank...');
const chromeProcess = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    '--user-data-dir=C:\\Users\\Administrator\\AppData\\Local\\Temp\\chrome_profile_test_gcs',
    'about:blank'
]);

chromeProcess.stderr.on('data', (data) => {
    // console.log(`chrome stderr: ${data}`);
});

setTimeout(async () => {
    try {
        console.log('Fetching debugging targets...');
        http.get('http://127.0.0.1:9223/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const targets = JSON.parse(data);
                const pageTarget = targets.find(t => t.type === 'page');
                if (!pageTarget) {
                    console.error('No page target found! All targets:', targets);
                    chromeProcess.kill();
                    process.exit(1);
                }
                
                console.log('Connecting to WebSocket:', pageTarget.webSocketDebuggerUrl);
                const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
                ws.on('open', () => {
                    console.log('Connected! Enabling domains and navigating...');
                    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
                    ws.send(JSON.stringify({ id: 2, method: 'Network.enable' }));
                    ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
                    
                    // Disable cache
                    ws.send(JSON.stringify({
                        id: 5,
                        method: 'Network.setCacheDisabled',
                        params: { cacheDisabled: true }
                    }));
                    
                    // Send navigate command
                    setTimeout(() => {
                        ws.send(JSON.stringify({
                            id: 4,
                            method: 'Page.navigate',
                            params: { url: 'https://storage.googleapis.com/leestudymath/index.html' }
                        }));
                    }, 500);
                });
                
                ws.on('message', (message) => {
                    const msg = JSON.parse(message);
                    if (msg.method === 'Runtime.consoleAPICalled') {
                        const args = msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || JSON.stringify(a))).join(' ');
                        console.log(`[CONSOLE LOG] ${args}`);
                    } else if (msg.method === 'Runtime.exceptionThrown') {
                        console.log(`[EXCEPTION]`, msg.params.exceptionDetails.exception.description || msg.params.exceptionDetails.text);
                    } else if (msg.method === 'Network.responseReceived') {
                        const resp = msg.params.response;
                        console.log(`[NETWORK RESPONSE] ${resp.url} - Status ${resp.status} - MIME: ${resp.mimeType}`);
                    } else if (msg.method === 'Network.loadingFailed') {
                        console.log(`[NETWORK FAILED] Request ID ${msg.params.requestId} - Error: ${msg.params.errorText}`);
                    }
                });
                
                // Fetch DOM head and window location after load
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        id: 10,
                        method: 'Runtime.evaluate',
                        params: { expression: 'JSON.stringify({ href: window.location.href, head: document.head.innerHTML })' }
                    }));
                }, 5000);
                
                ws.on('message', (message) => {
                    const msg = JSON.parse(message);
                    if (msg.id === 10) {
                        const result = JSON.parse(msg.result.result.value);
                        console.log('--- BROWSER STATE ---');
                        console.log('Location:', result.href);
                        console.log('Head HTML:');
                        console.log(result.head);
                        console.log('---------------------');
                    }
                });
                
                setTimeout(() => {
                    console.log('Finished diagnostics. Killing Chrome...');
                    chromeProcess.kill();
                    ws.close();
                    process.exit(0);
                }, 12000);
            });
        }).on('error', (err) => {
            console.error('Failed to get targets:', err.message);
            chromeProcess.kill();
            process.exit(1);
        });
    } catch (e) {
        console.error('Error during test:', e);
        chromeProcess.kill();
        process.exit(1);
    }
}, 3000);

