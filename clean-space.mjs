import { NodeSSH } from 'node-ssh';

async function main() {
  const ssh = new NodeSSH();
  
  console.log('🔌 Подключение к VPS...');
  await ssh.connect({
    host: '179.61.145.218',
    username: 'root',
    password: '0B9aYF6G32K7',
    readyTimeout: 30000
  });
  
  // Проверяем место
  console.log('📊 Текущее место на диске:');
  const df1 = await ssh.execCommand('df -h /');
  console.log(df1.stdout);
  
  console.log('\n📁 Самые большие папки:');
  const du = await ssh.execCommand('du -sh /* 2>/dev/null | sort -rh | head -20');
  console.log(du.stdout);
  
  console.log('\n🗑️ Очистка...\n');
  
  // Системные очистки
  console.log('• Очистка apt кэша...');
  await ssh.execCommand('apt-get clean 2>/dev/null || true');
  await ssh.execCommand('rm -rf /var/cache/apt/archives/*.deb 2>/dev/null || true');
  
  console.log('• Очистка журналов...');
  await ssh.execCommand('journalctl --vacuum-time=1d 2>/dev/null || true');
  await ssh.execCommand('rm -rf /var/log/*.gz /var/log/*.1 /var/log/*.old 2>/dev/null || true');
  await ssh.execCommand('truncate -s 0 /var/log/syslog 2>/dev/null || true');
  await ssh.execCommand('truncate -s 0 /var/log/messages 2>/dev/null || true');
  
  console.log('• Очистка tmp...');
  await ssh.execCommand('rm -rf /tmp/* 2>/dev/null || true');
  await ssh.execCommand('rm -rf /var/tmp/* 2>/dev/null || true');
  
  console.log('• Очистка npm/bun кэша...');
  await ssh.execCommand('rm -rf /root/.npm/_cacache 2>/dev/null || true');
  await ssh.execCommand('rm -rf /root/.bun/install/cache/* 2>/dev/null || true');
  
  console.log('• Очистка PM2 логов...');
  await ssh.execCommand('pm2 flush 2>/dev/null || true');
  await ssh.execCommand('rm -rf /root/.pm2/logs/*.gz 2>/dev/null || true');
  await ssh.execCommand('truncate -s 0 /root/.pm2/logs/*.log 2>/dev/null || true');
  
  console.log('• Очистка старых бэкапов...');
  await ssh.execCommand('rm -rf /root/chatchain/*.zip 2>/dev/null || true');
  await ssh.execCommand('rm -rf /root/backup* 2>/dev/null || true');
  await ssh.execCommand('rm -rf /root/chatchain/download/*.zip 2>/dev/null || true');
  
  console.log('• Очистка .next кэша...');
  await ssh.execCommand('rm -rf /root/chatchain/.next/cache 2>/dev/null || true');
  
  console.log('• Удаление node_modules из старых проектов...');
  await ssh.execCommand('find /root -name "node_modules" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true');
  
  console.log('• Очистка данных игр (удалены)...');
  await ssh.execCommand('rm -rf /root/chatchain/data/fortress 2>/dev/null || true');
  await ssh.execCommand('rm -rf /root/chatchain/data/surviv* 2>/dev/null || true');
  
  console.log('• Очистка старых скомпилированных серверов...');
  await ssh.execCommand('rm -rf /root/chatchain/dist 2>/dev/null || true');
  
  console.log('• Swap file cleanup (если большой)...');
  const swapCheck = await ssh.execCommand('ls -lh /swapfile 2>/dev/null');
  if (swapCheck.stdout.includes('2.0G')) {
    console.log('  Swap OK (2GB)');
  }
  
  console.log('\n📊 Место после очистки:');
  const df2 = await ssh.execCommand('df -h /');
  console.log(df2.stdout);
  
  console.log('\n📁 Топ папок в /root:');
  const duRoot = await ssh.execCommand('du -sh /root/* 2>/dev/null | sort -rh | head -10');
  console.log(duRoot.stdout);
  
  console.log('\n📁 Топ папок в chatchain:');
  const duChat = await ssh.execCommand('du -sh /root/chatchain/* 2>/dev/null | sort -rh | head -15');
  console.log(duChat.stdout);
  
  ssh.dispose();
  console.log('\n✅ Очистка завершена!');
}

main().catch(e => console.error('Error:', e.message));
