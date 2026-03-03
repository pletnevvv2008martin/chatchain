import { Client } from 'ssh2';

const VPS_HOST = '179.61.145.218';
const VPS_USER = 'root';
const VPS_PASSWORD = '0B9aYF6G32K7';

const commands = [
  // Проверяем структуру
  'ls -la /root/',
  'ls -la /root/chatchain/ 2>/dev/null || echo "Directory not found"',

  // Устанавливаем bun если нет
  'which bun || curl -fsSL https://bun.sh/install | bash',

  // Создаём папку и клонируем репозиторий
  'rm -rf /root/chatchain-new',
  'git clone https://github.com/pletnevvv2008martin/chatchain.git /root/chatchain-new',

  // Устанавливаем зависимости
  'export PATH="$HOME/.bun/bin:$PATH" && cd /root/chatchain-new && bun install',

  // Обновляем пути в PM2
  'pm2 delete all 2>/dev/null || true',
  'export PATH="$HOME/.bun/bin:$PATH" && cd /root/chatchain-new && pm2 start "bun run dev" --name chatchain-site',
  'export PATH="$HOME/.bun/bin:$PATH" && cd /root/chatchain-new && pm2 start "bun server/index.ts" --name fortress-game',

  // Перемещаем старую папку
  'mv /root/chatchain /root/chatchain-old 2>/dev/null || true',
  'mv /root/chatchain-new /root/chatchain',

  // Сохраняем PM2
  'pm2 save',

  // Показываем статус
  'pm2 list'
];

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH connected!\n');

  const runCommands = (cmds, index = 0) => {
    if (index >= cmds.length) {
      console.log('\n✅ Все команды выполнены!');
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
      stream.on('close', (code) => {
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
