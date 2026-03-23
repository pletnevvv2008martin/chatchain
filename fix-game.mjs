import { Client } from 'ssh2';

const VPS_HOST = '179.61.145.218';
const VPS_USER = 'root';
const VPS_PASSWORD = '0B9aYF6G32K7';

const commands = [
  // Проверяем логи ошибок
  'pm2 logs fortress-game --lines 20 --nostream',

  // Устанавливаем colyseus
  'export PATH="$HOME/.bun/bin:$PATH" && cd /root/chatchain && bun add colyseus@0.15.0',

  // Перезапускаем
  'pm2 restart fortress-game',

  // Ждём и проверяем
  'sleep 3 && pm2 list',

  // Проверяем здоровье
  'curl -s http://localhost:2567/health || echo "Game server not responding"',

  // Проверяем сайт
  'curl -s http://localhost:3000 | head -c 100 || echo "Site not responding"'
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
