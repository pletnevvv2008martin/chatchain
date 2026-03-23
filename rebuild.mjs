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
  
  console.log('🔨 Сборка проекта (это займёт ~2 минуты)...\n');
  
  const result = await ssh.execCommand(
    'cd /root/chatchain && export PATH="$HOME/.bun/bin:$PATH" && bun run build 2>&1',
    { execOptions: { maxBuffer: 5000000 } }
  );
  
  // Выводим результат
  const lines = result.stdout.split('\n');
  console.log(lines.slice(-40).join('\n'));
  
  if (result.stderr && !result.stderr.includes('npm notice')) {
    console.log('\nStderr:', result.stderr.slice(-500));
  }
  
  console.log('\n🔄 Перезапуск chatchain-site...');
  await ssh.execCommand('pm2 restart chatchain-site');
  
  const pm2list = await ssh.execCommand('pm2 list');
  console.log(pm2list.stdout);
  
  ssh.dispose();
  console.log('\n✅ Готово!');
}

main().catch(e => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
