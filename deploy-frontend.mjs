import { NodeSSH } from 'node-ssh';
import fs from 'fs';

async function deploy() {
  const ssh = new NodeSSH();
  
  console.log('🔌 Подключение к VPS...');
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });
  
  // Загружаем обновлённый dating/page.tsx
  console.log('📤 Загрузка dating/page.tsx...');
  await ssh.putFile(
    'src/app/dating/page.tsx',
    '/root/chatchain/src/app/dating/page.tsx'
  );
  
  console.log('🔨 Сборка проекта...');
  const build = await ssh.execCommand('cd /root/chatchain && export PATH="$HOME/.bun/bin:$PATH" && bun run build 2>&1');
  console.log(build.stdout.slice(-1000));
  
  if (build.stderr) {
    console.log('Errors:', build.stderr.slice(-500));
  }
  
  console.log('🔄 Перезапуск сайта...');
  await ssh.execCommand('pm2 restart chatchain-site');
  
  console.log('✅ Деплой фронтенда завершён!');
  
  ssh.dispose();
}

deploy().catch(console.error);
