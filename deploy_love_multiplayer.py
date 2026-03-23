#!/usr/bin/env python3
import paramiko
import time
import os

# SSH credentials
HOST = "179.61.145.218"
USER = "root"
PASSWORD = "0B9aYF6G32K7"

# Files to upload
files_to_upload = [
    ("/home/z/my-project/src/app/dating/page.tsx", "/root/chatchain/src/app/dating/page.tsx"),
    ("/home/z/my-project/server/index.ts", "/root/chatchain/server/index.ts"),
    ("/home/z/my-project/server/love-schema.ts", "/root/chatchain/server/love-schema.ts"),
    ("/home/z/my-project/server/love-room.ts", "/root/chatchain/server/love-room.ts"),
]

print(f"📡 Подключение к {HOST}...")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("✅ Подключено!")
    
    sftp = ssh.open_sftp()
    
    # Upload files
    for local_path, remote_path in files_to_upload:
        if os.path.exists(local_path):
            print(f"📤 Загрузка: {os.path.basename(local_path)}")
            # Ensure directory exists
            remote_dir = os.path.dirname(remote_path)
            try:
                sftp.stat(remote_dir)
            except:
                ssh.exec_command(f"mkdir -p {remote_dir}")
            
            with open(local_path, 'r') as f:
                content = f.read()
            
            with sftp.file(remote_path, 'w') as remote_file:
                remote_file.write(content)
        else:
            print(f"⚠️ Файл не найден: {local_path}")
    
    sftp.close()
    print("✅ Все файлы загружены!")
    
    # Build and restart
    build_cmd = """
    cd /root/chatchain
    source ~/.bashrc 2>/dev/null || true
    export PATH="$HOME/.bun/bin:$PATH"
    
    echo "🛑 Остановка серверов..."
    pm2 stop all
    
    echo "📦 Сборка клиента..."
    bun run build
    
    echo "📦 Сборка сервера (fortress)..."
    cd server && bun build --compile index.ts --outfile ../fortress-server && cd ..
    
    echo "🚀 Запуск серверов..."
    pm2 start all
    pm2 save
    
    echo "✅ Готово!"
    """
    
    print("🔧 Сборка и деплой...")
    stdin, stdout, stderr = ssh.exec_command(build_cmd, timeout=300)
    
    # Wait and print output
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            line = stdout.channel.recv(1024).decode()
            print(f"   {line.strip()}")
        if stderr.channel.recv_stderr_ready():
            err = stderr.channel.recv_stderr(1024).decode()
            if err.strip():
                print(f"   ⚠️ {err.strip()}")
        time.sleep(0.1)
    
    remaining = stdout.read().decode()
    if remaining:
        print(f"   {remaining}")
    
    print("\n🎉 Деплой завершён!")
    print("🌐 Проверьте: http://179.61.145.218:3000/dating")
    
except Exception as e:
    print(f"❌ Ошибка: {e}")
    import traceback
    traceback.print_exc()
finally:
    ssh.close()
