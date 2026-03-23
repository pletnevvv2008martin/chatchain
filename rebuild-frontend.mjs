import { NodeSSH } from 'node-ssh';

async function rebuild() {
  const ssh = new NodeSSH();
  
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });
  
  console.log('🔨 Сборка фронтенда...');
  console.log('(это займёт ~2 минуты)');
  
  const build = await ssh.execCommand('cd /root/chatchain && export PATH="$HOME/.bun/bin:$PATH" && bun run build 2>&1');
  
  // Показываем последние строки
  const lines = build.stdout.split('\n');
  console.log(lines.slice(-30).join('\n'));
  
  if (build.stderr && !build.stderr.includes('npm notice')) {
    console.log('Errors:', build.stderr.slice(-500));
  }
  
  console.log('\n🔄 Перезапуск сайта...');
  await ssh.execCommand('pm2 restart chatchain-site');
  
  console.log('✅ Готово!');
  
  ssh.dispose();
}

rebuild().catch(console.error);
