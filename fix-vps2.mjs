import SSH2 from 'ssh2';

const HOST = '179.61.145.218';
const USER = 'root';
const PASS = '0B9aYF6G32K7';

const commands = [
  'export PATH="$HOME/.bun/bin:$PATH"',
  'cd /root/chatchain',
  'rm -rf node_modules bun.lock',
  'bun add colyseus@0.15.0 @colyseus/schema@2.0.8 @colyseus/core@0.15.0',
  'cd server',
  'bun build index.ts --compile --outfile ../fortress-server 2>&1 || echo "Build failed"',
  'ls -la ../fortress-server 2>&1 || echo "No binary"',
  'pm2 restart fortress 2>&1 || pm2 start ../fortress-server --name fortress',
  'sleep 2',
  'curl -s http://localhost:2567/health 2>&1 || echo "Not responding"'
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
      console.log(`\n📡 Done, code: ${code}`);
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
