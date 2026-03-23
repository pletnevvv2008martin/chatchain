import { NodeSSH } from 'node-ssh';

async function deploy() {
  const ssh = new NodeSSH();
  
  console.log('🔌 Подключение к VPS...');
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });
  
  console.log('📁 Создание директорий...');
  await ssh.execCommand('mkdir -p /root/chatchain/server-dist/server');
  
  console.log('📤 Загрузка файлов сервера...');
  
  // Загружаем скомпилированные файлы
  const files = [
    'server/index.js',
    'server/love-room.js',
    'server/love-schema.js',
    'server/fortress-room.js',
    'server/fortress-schema.js',
    'server/fortress-maps.js'
  ];
  
  for (const file of files) {
    await ssh.putFile(`dist/${file}`, `/root/chatchain/server-dist/${file}`);
    console.log(`  ✅ ${file}`);
  }
  
  console.log('📦 Установка зависимостей...');
  await ssh.execCommand('cd /root/chatchain/server-dist && npm init -y 2>/dev/null || true');
  await ssh.execCommand('cd /root/chatchain/server-dist && npm install colyseus@0.15.0 @colyseus/schema@2.0.15 --save 2>&1');
  
  console.log('🔄 Перезапуск сервера...');
  
  // Останавливаем старый процесс
  await ssh.execCommand('pm2 delete fortress 2>/dev/null || true');
  
  // Запускаем новый
  const result = await ssh.execCommand('cd /root/chatchain/server-dist && pm2 start server/index.js --name fortress');
  console.log(result.stdout);
  console.log(result.stderr);
  
  // Сохраняем PM2 конфиг
  await ssh.execCommand('pm2 save');
  
  console.log('✅ Деплой завершён!');
  
  // Проверяем статус
  const status = await ssh.execCommand('pm2 list');
  console.log(status.stdout);
  
  ssh.dispose();
}

deploy().catch(console.error);
