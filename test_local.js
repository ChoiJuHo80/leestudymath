import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

console.log('Starting Chrome pointing to http://localhost:5173/...');
const chromeProcess = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    '--user-data-dir=C:\\Users\\Administrator\\AppData\\Local\\Temp\\chrome_profile_test_local',
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
                            params: { url: 'http://localhost:5173/' }
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
                        params: { 
                            expression: `
                                (async () => {
                                    try {
                                        console.log('[TEST] Triggering admin setups...');
                                        const adminSetup = window.handleAdminLoginSetup;
                                        if (adminSetup) {
                                            console.log('[TEST] Found handleAdminLoginSetup, calling it...');
                                            adminSetup();
                                        } else {
                                            console.log('[TEST] No handleAdminLoginSetup found, fallback...');
                                            window.isAdmin = true;
                                            document.getElementById('students').style.display = 'block';
                                        }
                                        
                                        await new Promise(r => setTimeout(r, 1000));
                                        
                                        console.log('[TEST] Checking edit buttons...');
                                        const editBtns = document.querySelectorAll('.btn-student-edit');
                                        console.log('[TEST] Found ' + editBtns.length + ' edit buttons.');
                                        
                                        if (editBtns.length > 0) {
                                            console.log('[TEST] Clicking the first edit button...');
                                            editBtns[0].click();
                                            await new Promise(r => setTimeout(r, 500));
                                            const modal = document.getElementById('student-form-modal');
                                            console.log('[TEST] Is modal open?', modal ? modal.classList.contains('open') : 'no modal');
                                        }
                                        
                                    } catch (e) {
                                        console.log('[TEST] Error in test:', e.message, e.stack);
                                    }
                                })()
                            `,
                            awaitPromise: true
                        }
                    }));
                }, 4000);
                
                ws.on('message', (message) => {
                    const msg = JSON.parse(message);
                    if (msg.id === 10) {
                        const val = msg.result.result.value;
                        console.log('--- DIAGNOSTIC RESULT ---');
                        console.log(JSON.stringify(val, null, 2));
                        console.log('-------------------------');
                    }
                });
                
                setTimeout(() => {
                    console.log('Finished diagnostics. Killing Chrome...');
                    chromeProcess.kill();
                    ws.close();
                    process.exit(0);
                }, 8000);
            });
        }).on('error', (err) => {
            console.error('Failed to connect to Chrome debugging port:', err.message);
            chromeProcess.kill();
        });
    } catch (e) {
        console.error('Error during setup:', e);
        chromeProcess.kill();
    }
}, 2000);
