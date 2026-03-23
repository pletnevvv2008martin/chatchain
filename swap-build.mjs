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
  
  // Останавливаем всё кроме essentials
  console.log('⏸️ Остановка процессов для освобождения памяти...');
  await ssh.execCommand('pm2 stop all');
  
  // Создаём swap если его мало
  console.log('💾 Настройка swap...');
  await ssh.execCommand('swapoff -a 2>/dev/null || true');
  await ssh.execCommand('dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null || true');
  await ssh.execCommand('chmod 600 /swapfile 2>/dev/null || true');
  await ssh.execCommand('mkswap /swapfile 2>/dev/null || true');
  await ssh.execCommand('swapon /swapfile 2>/dev/null || true');
  
  const mem = await ssh.execCommand('free -h');
  console.log(mem.stdout);
  
  // Очищаем всё
  await ssh.execCommand('rm -rf /root/chatchain/.next/cache /root/chatchain/.next/lock');
  await ssh.execCommand('sync && echo 3 > /proc/sys/vm/drop_caches');
  
  console.log('\n🔨 Сборка...\n');
  
  const result = await ssh.execCommand(
    'cd /root/chatchain && export PATH="$HOME/.bun/bin:$PATH" && NODE_OPTIONS="--max-old-space-size=768" bun run build 2>&1',
    { execOptions: { maxBuffer: 5000000, timeout: 400000 } }
  );
  
  console.log(result.stdout.slice(-3000));
  
  console.log('\n🚀 Запуск...');
  await ssh.execCommand('pm2 start all');
  
  await new Promise(r => setTimeout(r, 2000));
  const list = await ssh.execCommand('pm2 list');
  console.log(list.stdout);
  
  ssh.dispose();
}

main().catch(e => console.error('Error:', e.message));
