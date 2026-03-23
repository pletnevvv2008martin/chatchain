import { NodeSSH } from 'node-ssh';

async function upload() {
  const ssh = new NodeSSH();
  
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });
  
  console.log('📤 Загрузка index.ts...');
  await ssh.putFile('server/index.ts', '/root/chatchain/server/index.ts');
  
  console.log('📤 Загрузка chat-room.ts...');
  await ssh.putFile('server/chat-room.ts', '/root/chatchain/server/chat-room.ts');
  
  console.log('📤 Загрузка chat-schema.ts...');
  await ssh.putFile('server/chat-schema.ts', '/root/chatchain/server/chat-schema.ts');
  
  console.log('🔨 Компиляция сервера на VPS...');
  const compile = await ssh.execCommand(
    'cd /root/chatchain && export PATH="$HOME/.bun/bin:$PATH" && ' +
    'bunx tsc server/index.ts --outDir server-dist/server --esModuleInterop --experimentalDecorators --emitDecoratorMetadata --target ES2020 --module commonjs --skipLibCheck 2>&1 || ' +
    'echo "Trying alternative compile..."'
  );
  console.log(compile.stdout);
  if (compile.stderr) console.log('stderr:', compile.stderr.slice(-500));
  
  // Загружаем уже скомпилированные файлы
  console.log('\n📤 Загрузка скомпилированных файлов...');
  await ssh.putFile('dist/server/index.js', '/root/chatchain/server-dist/server/index.js');
  await ssh.putFile('dist/server/chat-room.js', '/root/chatchain/server-dist/server/chat-room.js');
  await ssh.putFile('dist/server/chat-schema.js', '/root/chatchain/server-dist/server/chat-schema.js');
  
  console.log('🔄 Перезапуск...');
  await ssh.execCommand('pm2 restart fortress');
  
  await new Promise(r => setTimeout(r, 2000));
  
  const logs = await ssh.execCommand('pm2 logs fortress --lines 15 --nostream 2>&1');
  console.log(logs.stdout);
  
  ssh.dispose();
}

upload().catch(console.error);
