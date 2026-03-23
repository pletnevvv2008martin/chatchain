import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected!');

  conn.exec('pm2 list && pm2 restart all && sleep 2 && pm2 list', (err, stream) => {
    if (err) console.error(err);
    let out = '';
    stream.on('data', (d) => out += d.toString())
          .on('close', () => { console.log(out); conn.end(); });
  });
}).connect({
  host: '179.61.145.218',
  port: 22,
  username: 'root',
  password: '0B9aYF6G32K7',
  readyTimeout: 10000
});

setTimeout(() => { console.log('Done'); process.exit(0); }, 25000);
