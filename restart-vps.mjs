import { Client } from 'ssh2';

const VPS_HOST = '179.61.145.218';
const VPS_USER = 'root';
const VPS_PASSWORD = '0B9aYF6G32K7';

const commands = [
  // Останавливаем всё
  'pm2 delete all',

  // Удаляем старую директорию
  'rm -rf /root/chatchain-new',

  // Проверяем структуру
  'ls -la /root/chatchain/server/',

  // Запускаем сайт из правильной директории
  'export PATH="$HOME/.bun/bin:$PATH" && cd /root/chatchain && pm2 start "bun run dev" --name chatchain-site',

  // Запускаем game сервер из правильной директории
  'export PATH="$HOME/.bun/bin:$PATH" && cd /root/chatchain && pm2 start "bun server/index.ts" --name fortress-game',

  // Сохраняем
  'pm2 save',

  // Ждём запуска
  'sleep 5',

  // Проверяем статус
  'pm2 list',

  // Проверяем логи game сервера
  'pm2 logs fortress-game --lines 15 --nostream',

  // Проверяем здоровье
  'curl -s http://localhost:2567/health',
  'curl -s http://localhost:3000 | head -c 200'
];

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH connected!\n');

  const runCommands = (cmds, index = 0) => {
    if (index >= cmds.length) {
      console.log('\n✅ Done!');
      conn.end();
      return;
    }

    const cmd = cmds[index];
    console.log(`\n> ${cmd}`);

    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`Error: ${err.message}`);
        runCommands(cmds, index + 1);
        return;
      }

      let output = '';
      stream.on('close', () => {
        console.log(output);
        runCommands(cmds, index + 1);
      }).on('data', (data) => {
        output += data.toString();
      }).stderr.on('data', (data) => {
        output += data.toString();
      });
    });
  };

  runCommands(commands);
}).on('error', (err) => {
  console.error('❌ SSH Error:', err.message);
}).connect({
  host: VPS_HOST,
  port: 22,
  username: VPS_USER,
  password: VPS_PASSWORD,
  readyTimeout: 30000
});
