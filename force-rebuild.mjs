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
  
  // Удаляем lock
  console.log('🔓 Удаление lock файла...');
  await ssh.execCommand('rm -f /root/chatchain/.next/lock');
  
  // Убиваем зависшие процессы
  console.log('🔪 Удаление зависших процессов...');
  await ssh.execCommand('pkill -f "next build" 2>/dev/null || true');
  
  // Ждём секунду
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('🔨 Сборка проекта...\n');
  
  const result = await ssh.execCommand(
    'cd /root/chatchain && export PATH="$HOME/.bun/bin:$PATH" && bun run build 2>&1',
    { execOptions: { maxBuffer: 5000000 } }
  );
  
  const lines = result.stdout.split('\n');
  console.log(lines.slice(-50).join('\n'));
  
  if (result.stderr) {
    const errLines = result.stderr.split('\n').filter(l => !l.includes('npm notice'));
    if (errLines.length > 0) {
      console.log('\nStderr:', errLines.slice(-10).join('\n'));
    }
  }
  
  console.log('\n🔄 Перезапуск сайта...');
  await ssh.execCommand('pm2 restart chatchain-site');
  
  // Ждём и проверяем
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
