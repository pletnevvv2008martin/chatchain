import { Client } from 'ssh2';
import readline from 'readline';

// Создаём интерфейс для чтения пароля
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const VPS_HOST = '179.61.145.218';
const VPS_USER = 'root';

// Функция для запроса пароля
const askPassword = () => {
  return new Promise((resolve) => {
    // Скрытый ввод пароля
    process.stdout.write('Введите пароль VPS: ');
    process.stdin.setRawMode(true);
    let password = '';
    process.stdin.resume();
    process.stdin.on('data', (char) => {
      const c = char.toString('utf8');
      switch(c) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          process.stdin.setRawMode(false);
          process.stdin.pause();
          console.log('');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        default:
          password += c;
          break;
      }
    });
  });
};

const commands = [
  'cd /root/chatchain && git fetch origin',
  'cd /root/chatchain && git reset --hard origin/master',
  'cd /root/chatchain && bun install',
  'pm2 restart all',
  'pm2 list'
];

async function main() {
  const password = await askPassword();

  const conn = new Client();

  conn.on('ready', () => {
    console.log('✅ SSH подключено!\n');

    const runCommands = (cmds, index = 0) => {
      if (index >= cmds.length) {
        console.log('\n✅ Все команды выполнены!');
        conn.end();
        process.exit(0);
        return;
      }

      const cmd = cmds[index];
      console.log(`> ${cmd}`);

      conn.exec(cmd, (err, stream) => {
        if (err) {
          console.error(`❌ Ошибка: ${err.message}`);
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
    console.error('❌ Ошибка SSH:', err.message);
    if (err.message.includes('authentication')) {
      console.error('Неверный пароль или пользователь');
    }
    process.exit(1);
  });

  console.log(`🔌 Подключение к ${VPS_HOST}...`);
  conn.connect({
    host: VPS_HOST,
    port: 22,
    username: VPS_USER,
    password: password,
    readyTimeout: 30000
  });
}

main();
