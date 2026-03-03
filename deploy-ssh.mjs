import SSH2 from 'ssh2';

const HOST = '179.61.145.218';
const USER = 'root';
const PASS = '0B9aYF6G32K7';

const commands = [
  'export PATH="$HOME/.bun/bin:$PATH"',
  'cd /root/chatchain',
  'git fetch origin',
  'git reset --hard origin/main',
  'bun install',
  'cd server && bun build index.ts --compile --outfile ../fortress-server',
  'pm2 restart fortress || pm2 start ../fortress-server --name fortress',
  'pm2 list'
].join(' && ');

const conn = new SSH2.Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected!');
  
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      console.log(`\n📡 Stream closed, code: ${code}, signal: ${signal}`);
      conn.end();
      process.exit(code);
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
  process.exit(1);
}).connect({
  host: HOST,
  port: 22,
  username: USER,
  password: PASS
});
