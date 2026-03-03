import { Client } from 'ssh2';
const c = new Client();
c.on('ready', () => {
  c.exec('pm2 delete fortress-game; cd /root/chatchain && pm2 start "node dist/index.js" --name fortress-game; sleep 2; pm2 list; curl -s http://localhost:2567/health', (e, s) => {
    let o = '';
    s.on('data', d => o += d).on('close', () => { console.log(o); c.end(); });
  });
}).connect({ host: '179.61.145.218', port: 22, username: 'root', password: '0B9aYF6G32K7' });
