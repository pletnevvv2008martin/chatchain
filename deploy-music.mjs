import { NodeSSH } from 'node-ssh';

async function deploy() {
  const ssh = new NodeSSH();

  console.log('🔌 Подключение к VPS...');
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });

  console.log('📤 Загрузка SharedMusicPlayer.tsx...');
  await ssh.putFile('src/components/SharedMusicPlayer.tsx', '/root/chatchain/src/components/SharedMusicPlayer.tsx');

  console.log('📤 Загрузка Header.tsx...');
  await ssh.putFile('src/components/Header.tsx', '/root/chatchain/src/components/Header.tsx');

  console.log('📤 Загрузка music API...');
  await ssh.putFile('src/app/api/music/route.ts', '/root/chatchain/src/app/api/music/route.ts');

  console.log('🔨 Пересборка frontend...');
  const build = await ssh.execCommand('cd /root/chatchain && npm run build 2>&1');
  console.log(build.stdout);
  if (build.stderr) console.error(build.stderr);

  console.log('🔄 Перезапуск PM2...');
  await ssh.execCommand('pm2 restart chatchain-site');

  console.log('✅ Деплой завершён!');

  // Проверка
  const check = await ssh.execCommand('pm2 list');
  console.log(check.stdout);

  ssh.dispose();
}

deploy().catch(console.error);
