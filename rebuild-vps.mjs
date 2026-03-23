import { NodeSSH } from 'node-ssh';

async function rebuild() {
  const ssh = new NodeSSH();

  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });

  console.log('🔌 Подключено к VPS');

  // Удалить lock
  await ssh.execCommand('rm -f /root/chatchain/.next/lock');
  console.log('🔓 Lock удалён');

  // Остановить PM2
  await ssh.execCommand('pm2 stop chatchain-site');
  console.log('⏹️ PM2 остановлен');

  // Удалить старый .next
  await ssh.execCommand('rm -rf /root/chatchain/.next');
  console.log('🗑️ .next удалён');

  // Запустить билд
  console.log('🔨 Сборка (может занять 2-3 минуты)...');
  const buildResult = await ssh.execCommand('cd /root/chatchain && npm run build 2>&1');
  console.log('Build output (last 1000 chars):');
  console.log(buildResult.stdout.slice(-1000));

  // Запустить PM2
  await ssh.execCommand('pm2 start chatchain-site');
  console.log('▶️ PM2 запущен');

  // Проверка
  console.log('⏳ Проверка через 5 сек...');
  await new Promise(r => setTimeout(r, 5000));
  
  const curl = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000');
  console.log('🌐 HTTP статус:', curl.stdout);

  const pm2list = await ssh.execCommand('pm2 list');
  console.log(pm2list.stdout);

  ssh.dispose();
  console.log('✅ Готово!');
}

rebuild().catch(console.error);
