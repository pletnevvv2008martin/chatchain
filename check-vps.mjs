import SSH2 from 'ssh2';

const HOST = '179.61.145.218';
const USER = 'root';
const PASS = '0B9aYF6G32K7';

const commands = 'pm2 list && curl -s http://localhost:2567/health';

const conn = new SSH2.Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected!');
  
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      console.log('\n📡 Done');
      conn.end();
      process.exit(code);
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
  process.exit(1);
}).connect({
  host: HOST,
  port: 22,
  username: USER,
  password: PASS
});
