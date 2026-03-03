import { Client } from 'ssh2';
const c = new Client();
c.on('ready', () => {
  c.exec('cd /root/chatchain && npm install colyseus@0.15.0 @colyseus/schema@2.0.8 --legacy-peer-deps && pm2 start "node dist/index.js" --name fortress-game && sleep 3 && curl -s http://localhost:2567/health', (e, s) => {
    let o = '';
    s.on('data', d => o += d).on('close', () => { console.log(o); c.end(); });
  });
}).connect({ host: '179.61.145.218', port: 22, username: 'root', password: '0B9aYF6G32K7' });
