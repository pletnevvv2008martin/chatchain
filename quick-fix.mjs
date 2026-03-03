import SSH2 from 'ssh2';

const conn = new SSH2.Client();
conn.on('ready', () => {
  console.log('✅ SSH Connected!');
  
  // Simple command to restart the fortress server
  conn.exec('pm2 list', { pty: false }, (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('data', d => { output += d; });
    stream.on('close', () => {
      console.log(output);
      conn.end();
    });
  });
}).connect({
  host: '179.61.145.218',
  port: 22,
  username: 'root',
  password: '0B9aYF6G32K7',
  readyTimeout: 10000
});

setTimeout(() => { conn.end(); process.exit(0); }, 15000);
