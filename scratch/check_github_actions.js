const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/ChoiJuHo80/leestudymath/actions/runs?per_page=5',
  headers: {
    'User-Agent': 'NodeJS-Agent'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const runs = JSON.parse(data);
    console.log('--- GitHub Actions Runs ---');
    if (runs && runs.workflow_runs) {
      runs.workflow_runs.forEach(run => {
        console.log(`Run #${run.run_number} - Event: ${run.event} - Status: ${run.status} - Conclusion: ${run.conclusion} - Commit: ${run.head_commit.message.trim()}`);
      });
    } else {
      console.log('No runs found or API rate limited:', runs);
    }
  });
}).on('error', err => console.error(err));
