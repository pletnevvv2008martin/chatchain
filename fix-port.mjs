import SSH2 from 'ssh2';

const conn = new SSH2.Client();

const cmd = `
cd /root/chatchain
pm2 delete fortress-game 2>/dev/null || true
pm2 restart fortress
sleep 3
pm2 list
curl -s http://localhost:2567/health
`;

conn.on('ready', () => {
  console.log('Connected!');
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.setEncoding('utf8');
    stream.on('data', (data) => process.stdout.write(data));
    stream.stderr.on('data', (data) => process.stderr.write(data));
    stream.on('close', () => { conn.end(); setTimeout(() => process.exit(0), 500); });
  });
}).connect({
  host: '179.61.145.218',
  port: 22,
  username: 'root',
  password: '0B9aYF6G32K7',
  readyTimeout: 30000
});
setTimeout(() => { conn.end(); process.exit(0); }, 30000);
