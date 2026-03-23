import { NodeSSH } from 'node-ssh';

async function deploy() {
  const ssh = new NodeSSH();
  
  console.log('🔌 Подключение к VPS...');
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7',
    readyTimeout: 30000
  });
  
  console.log('\n📤 Загрузка серверных файлов...');
  await ssh.execCommand('mkdir -p /root/chatchain/server-dist/server');
  
  const serverFiles = [
    'dist/server/index.js',
    'dist/server/love-room.js',
    'dist/server/love-schema.js',
    'dist/server/chat-room.js',
    'dist/server/chat-schema.js'
  ];
  
  for (const file of serverFiles) {
    await ssh.putFile(file, `/root/chatchain/${file}`);
    console.log(`  ✅ ${file}`);
  }
  
  console.log('\n📤 Загрузка фронтенд файлов...');
  
  // Загружаем ключевые файлы
  await ssh.putFile('src/app/page.tsx', '/root/chatchain/src/app/page.tsx');
  console.log('  ✅ src/app/page.tsx');
  
  await ssh.putFile('src/app/globals.css', '/root/chatchain/src/app/globals.css');
  console.log('  ✅ src/app/globals.css');
  
  await ssh.putFile('src/app/api/link-preview/route.ts', '/root/chatchain/src/app/api/link-preview/route.ts');
  console.log('  ✅ src/app/api/link-preview/route.ts');
  
  await ssh.putFile('src/components/Header.tsx', '/root/chatchain/src/components/Header.tsx');
  console.log('  ✅ src/components/Header.tsx');
  
  // Перезапускаем сервер
  console.log('\n🔄 Перезапуск WebSocket сервера...');
  await ssh.execCommand('pm2 restart fortress');
  
  // Проверяем
  const health = await ssh.execCommand('curl -s http://localhost:2567/health');
  console.log('Health:', health.stdout);
  
  // Очищаем старые файлы
  console.log('\n🧹 Очистка...');
  await ssh.execCommand('rm -f /root/chatchain/server-dist/server/fortress-*.js');
  await ssh.execCommand('rm -rf /root/chatchain/.next/cache');
  
  console.log('\n🔨 Сборка фронтенда...');
  const build = await ssh.execCommand(
    'cd /root/chatchain && export PATH="$HOME/.bun/bin:$PATH" && NODE_OPTIONS="--max-old-space-size=768" bun run build 2>&1',
    { execOptions: { timeout: 300000 } }
  );
  
  console.log(build.stdout.slice(-2000));
  
  console.log('\n🚀 Перезапуск сайта...');
  await ssh.execCommand('pm2 restart chatchain-site');
  
  const pm2list = await ssh.execCommand('pm2 list');
  console.log(pm2list.stdout);
  
  ssh.dispose();
  console.log('\n✅ Деплой завершён!');
}

deploy().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
