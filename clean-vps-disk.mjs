import { NodeSSH } from 'node-ssh';

async function clean() {
  const ssh = new NodeSSH();

  console.log('🔌 Подключение к VPS...');
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7',
    readyTimeout: 60000
  });

  console.log('✅ Подключено!\n');

  // Проверка диска
  console.log('=== ДИСК ДО ОЧИСТКИ ===');
  const df1 = await ssh.execCommand('df -h /');
  console.log(df1.stdout);

  console.log('\n=== ОЧИСТКА ===');

  // Удалить старые билды
  console.log('🗑️ Удаление старых .next билдов...');
  await ssh.execCommand('rm -rf /root/chatchain/.next/cache');
  console.log('   cache удалён');

  // Удалить node_modules от старых проектов
  console.log('🗑️ Удаление лишних node_modules...');
  await ssh.execCommand('rm -rf /root/chatchain/node_modules/.cache');
  console.log('   .cache удалён');

  // Очистить npm кэш
  console.log('🗑️ Очистка npm кэша...');
  await ssh.execCommand('npm cache clean --force 2>/dev/null');
  console.log('   npm cache очищен');

  // Удалить временные файлы
  console.log('🗑️ Удаление tmp файлов...');
  await ssh.execCommand('rm -rf /tmp/* 2>/dev/null');
  console.log('   tmp очищен');

  // Удалить старые логи
  console.log('🗑️ Удаление старых логов...');
  await ssh.execCommand('rm -rf /root/.pm2/logs/*.log 2>/dev/null');
  await ssh.execCommand('pm2 flush');
  console.log('   логи очищены');

  // Удалить бэкапы
  console.log('🗑️ Удаление бэкапов...');
  await ssh.execCommand('rm -rf /root/chatchain/download/*.zip 2>/dev/null');
  await ssh.execCommand('rm -rf /root/*.zip 2>/dev/null');
  console.log('   бэкапы удалены');

  // Убить зависший билд
  console.log('🔪 Убиваем зависшие процессы node...');
  await ssh.execCommand('pkill -f "next build" 2>/dev/null');
  await ssh.execCommand('rm -f /root/chatchain/.next/lock 2>/dev/null');
  console.log('   зависшие процессы убиты');

  // Остановить screen build если есть
  await ssh.execCommand('screen -XS build quit 2>/dev/null');

  // Проверка диска после
  console.log('\n=== ДИСК ПОСЛЕ ОЧИСТКИ ===');
  const df2 = await ssh.execCommand('df -h /');
  console.log(df2.stdout);

  // Проверка памяти
  console.log('\n=== ПАМЯТЬ ===');
  const free = await ssh.execCommand('free -h');
  console.log(free.stdout);

  // Проверка места в проекте
  console.log('\n=== РАЗМЕР ПАПОК /root/chatchain ===');
  const du = await ssh.execCommand('du -sh /root/chatchain/* 2>/dev/null | sort -rh | head -10');
  console.log(du.stdout);

  console.log('\n=== PM2 СТАТУС ===');
  const pm2 = await ssh.execCommand('pm2 list');
  console.log(pm2.stdout);

  // Запуск сайта если остановлен
  const pm2Status = await ssh.execCommand('pm2 jlist');
  if (pm2Status.stdout.includes('"status":"stopped"')) {
    console.log('\n▶️ Запуск остановленного PM2...');
    await ssh.execCommand('pm2 restart chatchain-site');
    await new Promise(r => setTimeout(r, 3000));
    const check = await ssh.execCommand('pm2 list');
    console.log(check.stdout);
  }

  ssh.dispose();
  console.log('\n✅ Очистка завершена!');
}

clean().catch(e => console.error('Ошибка:', e.message));
