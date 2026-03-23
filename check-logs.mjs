import { NodeSSH } from 'node-ssh';

async function check() {
  const ssh = new NodeSSH();
  
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });
  
  console.log('📋 Логи сервера:');
  const logs = await ssh.execCommand('pm2 logs fortress --lines 20 --nostream 2>&1');
  console.log(logs.stdout);
  
  ssh.dispose();
}

check().catch(console.error);
