import { connect } from 'net';
import { exec } from 'child_process';

const HOST = '179.61.145.218';
const USER = 'root';
const PASS = '0B9aYF6G32K7';

// Simple SSH using expect-style commands via sshpass
const { spawn } = await import('child_process');

const commands = [
  'export PATH="$HOME/.bun/bin:$PATH"',
  'cd /root/chatchain',
  'git pull origin main || git fetch origin && git reset --hard origin/main',
  'bun install',
  'cd server && bun build index.ts --compile --outfile ../fortress-server',
  'pm2 restart fortress || pm2 start ../fortress-server --name fortress',
  'pm2 list'
];

const cmd = commands.join(' && ');
console.log('Executing:', cmd);

const ssh = spawn('sshpass', ['-p', PASS, 'ssh', '-o', 'StrictHostKeyChecking=no', `${USER}@${HOST}`, cmd]);

ssh.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ssh.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ssh.on('close', (code) => {
  console.log(`SSH exited with code ${code}`);
  process.exit(code);
});
