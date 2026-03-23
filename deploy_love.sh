#!/bin/bash
# Деплой игры Любовь на VPS
# Запустите этот скрипт на VPS сервере

echo "💕 Обновление игры Любовь..."

cd /root/chatchain

# Создаём директорию если нет
mkdir -p src/app/dating

# Скачиваем новую версию (если есть git)
if [ -d ".git" ]; then
    git pull
else
    echo "Нет git репозитория, обновляем вручную..."
fi

# Пересобираем
echo "📦 Сборка..."
bun run build

# Перезапускаем PM2
echo "🔄 Перезапуск..."
pm2 restart chatchain-site

echo "✅ Готово! Игра Любовь обновлена."
echo "🌐 Проверьте: http://179.61.145.218:3000/dating"
