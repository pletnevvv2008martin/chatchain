import { Client } from 'ssh2';

const VPS_HOST = '179.61.145.218';
const VPS_USER = 'root';
const VPS_PASSWORD = '0B9aYF6G32K7';

const commands = [
  // Создаём правильный tsconfig
  `cat > /root/chatchain/tsconfig.server.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./server",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "moduleResolution": "node"
  },
  "include": ["server/**/*"],
  "exclude": ["node_modules"]
}
EOF`,

  // Компилируем
  'cd /root/chatchain && npx tsc -p tsconfig.server.json',

  // Проверяем что скомпилировалось
  'ls -la /root/chatchain/dist/',

  // Останавливаем старый процесс
  'pm2 delete fortress-game',

  // Запускаем скомпилированный код
  'cd /root/chatchain && pm2 start "node dist/index.js" --name fortress-game',

  // Ждём
  'sleep 3',

  // Проверяем логи
  'pm2 logs fortress-game --lines 25 --nostream',

  // Проверяем здоровье
  'curl -s http://localhost:2567/health',

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
    console.log(`\n> ${cmd.split('\\n')[0].slice(0, 60)}...`);

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
