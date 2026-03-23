import { Client } from 'ssh2';
const c = new Client();
c.on('ready', () => {
  c.exec('pm2 delete 4; pm2 save; pm2 list', (e, s) => {
    let o = '';
    s.on('data', d => o += d).on('close', () => { console.log(o); c.end(); });
  });
}).connect({ host: '179.61.145.218', port: 22, username: 'root', password: '0B9aYF6G32K7' });
