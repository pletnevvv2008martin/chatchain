import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected!');

  const cmds = [
    'cd /root/chatchain && git fetch origin && git reset --hard origin/master',
    'cd /root/chatchain && npm install colyseus.js@0.15.0 --legacy-peer-deps',
    'cd /root/chatchain && npx tsc -p tsconfig.server.json 2>&1 | tail -5',
    'pm2 restart all',
    'sleep 3',
    'pm2 list',
    'curl -s http://localhost:2567/health'
  ];

  let i = 0;
  const run = () => {
    if (i >= cmds.length) { console.log('\n✅ Done!'); conn.end(); return; }
    console.log(`\n> ${cmds[i].slice(0, 50)}...`);
    conn.exec(cmds[i], (err, stream) => {
      let out = '';
      stream.on('data', (d) => out += d.toString())
            .stderr.on('data', (d) => out += d.toString())
            .on('close', () => { console.log(out); i++; run(); });
    });
  };
  run();
}).connect({
  host: '179.61.145.218',
  port: 22,
  username: 'root',
  password: '0B9aYF6G32K7'
});

setTimeout(() => process.exit(0), 120000);
