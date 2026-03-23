import { NodeSSH } from 'node-ssh';

async function upload() {
  const ssh = new NodeSSH();
  
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });
  
  console.log('📤 Загрузка серверных файлов...');
  
  // Удаляем старые fortress файлы
  await ssh.execCommand('rm -f /root/chatchain/server-dist/server/fortress-*.js');
  await ssh.execCommand('rm -f /root/chatchain/server-dist/server/fortress-*.d.ts');
  await ssh.execCommand('rm -f /root/chatchain/server-dist/server/fortress-*.js.map');
  
  // Загружаем новые файлы
  await ssh.putFile('dist/server/index.js', '/root/chatchain/server-dist/server/index.js');
  await ssh.putFile('dist/server/love-room.js', '/root/chatchain/server-dist/server/love-room.js');
  await ssh.putFile('dist/server/love-schema.js', '/root/chatchain/server-dist/server/love-schema.js');
  
  console.log('🔄 Перезапуск PM2...');
  await ssh.execCommand('pm2 restart fortress');
  
  console.log('📋 Статус PM2:');
  const status = await ssh.execCommand('pm2 list');
  console.log(status.stdout);
  
  // Проверяем health
  await new Promise(r => setTimeout(r, 2000));
  const health = await ssh.execCommand('curl -s http://localhost:2567/health');
  console.log('Health check:', health.stdout);
  
  ssh.dispose();
  console.log('✅ Готово!');
}

upload().catch(console.error);
