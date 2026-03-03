import SSH2 from 'ssh2';

const conn = new SSH2.Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS');
  
  const cmd = 'cd /root/chatchain && npm install colyseus@0.15.0 @colyseus/schema@2.0.8 --save --legacy-peer-deps && pm2 restart all && sleep 2 && pm2 list';
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    stream.on('data', (data) => process.stdout.write(data));
    stream.stderr.on('data', (data) => process.stderr.write(data));
    stream.on('close', (code) => {
      console.log('\n✅ Done, exit code:', code);
      conn.end();
      process.exit(code || 0);
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH Error:', err.message);
  process.exit(1);
});

conn.connect({
  host: '179.61.145.218',
  port: 22,
  username: 'root',
  password: '0B9aYF6G32K7',
  readyTimeout: 20000,
  keepaliveInterval: 5000
});
