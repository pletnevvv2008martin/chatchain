import SSH2 from 'ssh2';

const conn = new SSH2.Client();

conn.on('ready', () => {
  conn.exec('pm2 logs fortress --lines 20 --nostream', (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.setEncoding('utf8');
    stream.on('data', (data) => console.log(data));
    stream.stderr.on('data', (data) => console.error(data));
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
