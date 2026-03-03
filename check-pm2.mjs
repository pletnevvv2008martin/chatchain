import SSH2 from 'ssh2';

const conn = new SSH2.Client();

conn.on('ready', () => {
  console.log('SSH connected');
  
  conn.exec('pm2 list', (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.setEncoding('utf8');
    
    stream.on('data', (data) => {
      console.log(data);
    });
    
    stream.stderr.on('data', (data) => {
      console.error('stderr:', data);
    });
    
    stream.on('close', (code, signal) => {
      console.log('Stream closed, code:', code, 'signal:', signal);
      conn.end();
      setTimeout(() => process.exit(code || 0), 1000);
    });
  });
});

conn.on('error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

conn.connect({
  host: '179.61.145.218',
  port: 22,
  username: 'root',
  password: '0B9aYF6G32K7',
  readyTimeout: 30000
});

// Give it time
setTimeout(() => {
  console.log('Global timeout reached');
  conn.end();
  process.exit(0);
}, 45000);
