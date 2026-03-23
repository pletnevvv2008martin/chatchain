import SSH2 from 'ssh2';

const conn = new SSH2.Client();

conn.on('ready', () => {
  console.log('Connected!');
  
  conn.shell((err, stream) => {
    if (err) {
      console.error('Shell error:', err);
      return;
    }
    
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    
    stream.write('pm2 list\n');
    stream.write('exit\n');
    
    stream.on('close', () => {
      console.log('Shell closed');
      conn.end();
    });
  });
}).connect({
  host: '179.61.145.218',
  port: 22,
  username: 'root',
  password: '0B9aYF6G32K7'
});

setTimeout(() => {
  console.log('Timeout reached');
  conn.end();
  process.exit(0);
}, 25000);
