import { Client } from 'ssh2';

const VPS_HOST = '179.61.145.218';
const VPS_USER = 'root';
const VPS_PASSWORD = '0B9aYF6G32K7';

const commands = [
  // Проверяем node
  'node --version',

  // Устанавливаем зависимости для node
  'cd /root/chatchain && npm install --legacy-peer-deps 2>&1 | tail -20',

  // Останавливаем bun процесс
  'pm2 delete fortress-game',

  // Запускаем через node
  'cd /root/chatchain && pm2 start "npx tsx server/index.ts" --name fortress-game',

  // Ждём
  'sleep 5',

  // Проверяем логи
  'pm2 logs fortress-game --lines 20 --nostream',

  // Проверяем здоровье
  'curl -s http://localhost:2567/health',

  // Сохраняем
  'pm2 save',

  'pm2 list'
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
