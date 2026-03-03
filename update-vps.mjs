import { Client } from 'ssh2';

const VPS_HOST = '179.61.145.218';
const VPS_USER = 'root';
const VPS_PASSWORD = '0B9aYF6G32K7';

const commands = [
  'cd /root/chatchain',
  'git pull origin master',
  'bun install',
  'pm2 restart all',
  'pm2 list'
];

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH connected!');

  // Execute commands sequentially
  const runCommands = (cmds, index = 0) => {
    if (index >= cmds.length) {
      console.log('\n✅ All commands executed!');
      conn.end();
      return;
    }

    const cmd = cmds[index];
    console.log(`\n> ${cmd}`);

    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`Error: ${err.message}`);
        conn.end();
        return;
      }

      stream.on('close', (code) => {
        runCommands(cmds, index + 1);
      }).on('data', (data) => {
        console.log(data.toString().trim());
      }).stderr.on('data', (data) => {
        console.error(data.toString().trim());
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
