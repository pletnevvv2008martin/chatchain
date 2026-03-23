import { NodeSSH } from 'node-ssh';

async function startBuild() {
  const ssh = new NodeSSH();
  
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });
  
  // Запускаем сборку в фоне через nohup
  console.log('🚀 Запуск сборки в фоне...');
  await ssh.execCommand('cd /root/chatchain && export PATH="$HOME/.bun/bin:$PATH" && nohup bun run build > /tmp/build.log 2>&1 &');
  
  console.log('⏳ Сборка запущена. Подождите ~2 минуты.');
  console.log('Для проверки: curl http://179.61.145.218:3000');
  
  ssh.dispose();
}

startBuild().catch(console.error);
