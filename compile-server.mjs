import SSH2 from 'ssh2';

const conn = new SSH2.Client();

const cmd = `
cd /root/chatchain
mkdir -p dist/server

# Create tsconfig for server
cat > tsconfig.server.json << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "outDir": "./dist/server",
    "declaration": true
  },
  "include": ["server/**/*"]
}
TSCONFIG

# Compile
npx tsc -p tsconfig.server.json

# Start with node
pm2 delete fortress 2>/dev/null || true
pm2 start dist/server/index.js --name fortress

sleep 3
pm2 logs fortress --lines 15 --nostream
`;

conn.on('ready', () => {
  console.log('Connected!');
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.setEncoding('utf8');
    stream.on('data', (data) => process.stdout.write(data));
    stream.stderr.on('data', (data) => process.stderr.write(data));
    stream.on('close', () => { conn.end(); setTimeout(() => process.exit(0), 500); });
  });
}).connect({
  host: '179.61.145.218',
  port: 22,
  username: 'root',
  password: '0B9aYF6G32K7',
  readyTimeout: 30000
});
setTimeout(() => { conn.end(); process.exit(0); }, 90000);
