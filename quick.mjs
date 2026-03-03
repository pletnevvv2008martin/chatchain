import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected!');

  const cmd = 'cd /root/chatchain && git pull origin master && pm2 restart chatchain-site';

  conn.exec(cmd, (err, stream) => {
    if (err) console.error(err);
    stream.on('data', (d) => console.log(d.toString()))
          .on('close', () => { console.log('✅ Done!'); conn.end(); });
  });
}).connect({
  host: '179.61.145.218',
  port: 22,
  username: 'root',
  password: '0B9aYF6G32K7'
});

setTimeout(() => { console.log('Timeout'); process.exit(1); }, 60000);
