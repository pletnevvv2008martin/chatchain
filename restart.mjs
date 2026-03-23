import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected!');

  const cmd = 'pm2 restart fortress-game && sleep 3 && pm2 logs fortress-game --lines 10 --nostream && curl -s http://localhost:2567/health';

  conn.exec(cmd, (err, stream) => {
    if (err) console.error(err);
    let out = '';
    stream.on('data', (d) => out += d.toString())
          .on('close', () => { console.log(out); conn.end(); });
  });
}).connect({
  host: '179.61.145.218',
  port: 22,
  username: 'root',
  password: '0B9aYF6G32K7'
});

setTimeout(() => process.exit(0), 30000);
