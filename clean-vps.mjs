import { NodeSSH } from 'node-ssh';

async function clean() {
  const ssh = new NodeSSH();
  
  console.log('🔌 Подключение к VPS...');
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });
  
  console.log('🗑️ Удаление файлов Fortress...');
  await ssh.execCommand('rm -rf /root/chatchain/src/app/fortress');
  await ssh.execCommand('rm -f /root/chatchain/src/app/api/fortress/route.ts');
  await ssh.execCommand('rm -rf /root/chatchain/src/app/api/fortress');
  await ssh.execCommand('rm -f /root/chatchain/src/lib/fortress.ts');
  
  console.log('🗑️ Удаление файлов Surviv.io...');
  await ssh.execCommand('rm -rf /root/chatchain/src/app/surviv');
  
  console.log('🗑️ Удаление серверных файлов Fortress...');
  await ssh.execCommand('rm -f /root/chatchain/server-dist/server/fortress-*.js');
  await ssh.execCommand('rm -f /root/chatchain/server/fortress-*.ts');
  
  console.log('🗑️ Удаление данных игр...');
  await ssh.execCommand('rm -rf /root/chatchain/data/fortress');
  
  console.log('📤 Загрузка обновлённого Header.tsx...');
  await ssh.putFile('src/components/Header.tsx', '/root/chatchain/src/components/Header.tsx');
  
  console.log('📤 Загрузка обновлённого server/index.ts...');
  await ssh.putFile('server/index.ts', '/root/chatchain/server/index.ts');
  
  console.log('🔨 Пересборка сервера...');
  const buildServer = await ssh.execCommand('cd /root/chatchain/server-dist && npm run build 2>&1 || echo "no build script"');
  console.log(buildServer.stdout);
  
  console.log('🔄 Перезапуск PM2...');
  await ssh.execCommand('pm2 restart fortress');
  
  console.log('✅ Очистка завершена!');
  
  // Проверка
  const check = await ssh.execCommand('ls -la /root/chatchain/src/app/ | grep -E "fortress|surviv" || echo "Игры удалены"');
  console.log('Проверка:', check.stdout);
  
  ssh.dispose();
}

clean().catch(console.error);
