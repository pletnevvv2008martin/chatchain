import { NodeSSH } from 'node-ssh';

async function upload() {
  const ssh = new NodeSSH();
  
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7'
  });
  
  console.log('📤 Загрузка dating/page.tsx...');
  await ssh.putFile(
    'src/app/dating/page.tsx',
    '/root/chatchain/src/app/dating/page.tsx'
  );
  
  console.log('✅ Файл загружен!');
  
  ssh.dispose();
}

upload().catch(console.error);
