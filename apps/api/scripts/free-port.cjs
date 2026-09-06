const { execSync } = require('child_process');

const port = String(process.env.API_PORT ?? 4000);
const self = String(process.pid);

function listeningPids() {
  const pids = new Set();
  if (process.platform === 'win32') {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const needle = new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`, 'i');
    for (const line of out.split(/\r?\n/)) {
      const hit = line.match(needle);
      if (hit?.[1] && hit[1] !== '0' && hit[1] !== self) pids.add(hit[1]);
    }
    return pids;
  }
  try {
    const out = execSync(`lsof -t -iTCP:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim();
    for (const pid of out.split(/\s+/)) {
      if (pid && pid !== self) pids.add(pid);
    }
  } catch {
    return pids;
  }
  return pids;
}

for (const pid of listeningPids()) {
  try {
    if (process.platform === 'win32') execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    else execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
  } catch {
    /* already gone */
  }
}
