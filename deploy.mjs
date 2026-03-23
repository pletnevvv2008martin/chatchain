import { Client } from 'ssh2';
const c = new Client();
c.on('ready', () => {
  c.exec('cd /root/chatchain && git pull && pm2 restart chatchain-site && sleep 3 && curl -s http://localhost:3000 | head -c 100', (e, s) => {
    let o = '';
    s.on('data', d => o += d).on('close', () => { console.log(o); c.end(); });
  });
}).connect({ host: '179.61.145.218', port: 22, username: 'root', password: '0B9aYF6G32K7' });
