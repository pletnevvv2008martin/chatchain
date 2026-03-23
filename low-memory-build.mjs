import { NodeSSH } from 'node-ssh';

async function main() {
  const ssh = new NodeSSH();
  
  console.log('🔌 Подключение к VPS...');
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7',
    readyTimeout: 30000
  });
  
  // Проверяем память
  console.log('📊 Проверка памяти:');
  const mem = await ssh.execCommand('free -h');
  console.log(mem.stdout);
  
  // Останавливаем fortress временно для освобождения памяти
  console.log('\n⏸️ Остановка fortress для освобождения памяти...');
  await ssh.execCommand('pm2 stop fortress');
  
  // Очищаем кэш
  console.log('🧹 Очистка кэша...');
  await ssh.execCommand('sync && echo 3 > /proc/sys/vm/drop_caches');
  await ssh.execCommand('rm -rf /root/chatchain/.next/cache');
  
  // Проверяем память снова
  const mem2 = await ssh.execCommand('free -h');
  console.log(mem2.stdout);
  
  // Удаляем lock
  await ssh.execCommand('rm -f /root/chatchain/.next/lock');
  
  console.log('\n🔨 Сборка с ограничением памяти...\n');
  
  // Используем NODE_OPTIONS для ограничения памяти
  const result = await ssh.execCommand(
    'cd /root/chatchain && export PATH="$HOME/.bun/bin:$PATH" && NODE_OPTIONS="--max-old-space-size=1024" bun run build 2>&1',
    { execOptions: { maxBuffer: 5000000, timeout: 300000 } }
  );
  
  const lines = result.stdout.split('\n');
  console.log(lines.slice(-60).join('\n'));
  
  console.log('\n🔄 Запуск серверов...');
  await ssh.execCommand('pm2 restart chatchain-site');
  await ssh.execCommand('pm2 restart fortress');
  
  // Проверяем
  await new Promise(r => setTimeout(r, 3000));
  
  const pm2list = await ssh.execCommand('pm2 list');
  console.log(pm2list.stdout);
  
  ssh.dispose();
  console.log('\n✅ Готово!');
}

main().catch(e => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
