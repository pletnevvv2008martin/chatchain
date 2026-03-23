#!/usr/bin/env python3
import paramiko
import time

# SSH credentials
HOST = "179.61.145.218"
USER = "root"
PASSWORD = "0B9aYF6G32K7"

# Read the local file
with open("/home/z/my-project/src/app/dating/page.tsx", "r") as f:
    file_content = f.read()

print(f"📡 Подключение к {HOST}...")

# Create SSH client
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("✅ Подключено!")
    
    # Create SFTP
    sftp = ssh.open_sftp()
    
    # Upload file
    remote_path = "/root/chatchain/src/app/dating/page.tsx"
    print(f"📤 Загрузка файла на сервер...")
    
    with sftp.file(remote_path, 'w') as remote_file:
        remote_file.write(file_content)
    
    sftp.close()
    print("✅ Файл загружен!")
    
    # Run build commands with proper shell
    build_cmd = """
    cd /root/chatchain
    source ~/.bashrc 2>/dev/null || true
    export PATH="$HOME/.bun/bin:$PATH"
    pm2 stop chatchain-site
    bun run build
    pm2 start chatchain-site
    pm2 save
    """
    
    print("🔧 Выполняю сборку и деплой...")
    stdin, stdout, stderr = ssh.exec_command(build_cmd, timeout=300)
    
    # Print output in real-time
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            line = stdout.channel.recv(1024).decode()
            print(f"   {line.strip()}")
        if stderr.channel.recv_stderr_ready():
            err = stderr.channel.recv_stderr(1024).decode()
            if err.strip():
                print(f"   ⚠️ {err.strip()}")
        time.sleep(0.1)
    
    # Get remaining output
    remaining = stdout.read().decode()
    if remaining:
        print(f"   {remaining}")
    
    print("\n✅ Деплой завершён!")
    print("🌐 Проверьте: http://179.61.145.218:3000/dating")
    
except Exception as e:
    print(f"❌ Ошибка: {e}")
    import traceback
    traceback.print_exc()
finally:
    ssh.close()
