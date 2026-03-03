#!/bin/bash
# ============================================
# Скрипт обновления ChatChain VPS
# ============================================

echo "🚀 Начинаем обновление VPS..."
echo ""

# Переход в директорию проекта
cd /root/chatchain

# Git pull
echo "📥 Загрузка обновлений из GitHub..."
git pull origin master
echo ""

# Установка зависимостей
echo "📦 Установка зависимостей..."
bun install
echo ""

# Перезапуск сервисов
echo "🔄 Перезапуск сервисов..."
pm2 restart all
echo ""

# Проверка статуса
echo "📊 Статус сервисов:"
pm2 list
echo ""

# Проверка здоровья
echo "🏥 Проверка серверов..."
curl -s http://localhost:3000 | head -c 100 && echo "... ✅ Сайт работает"
curl -s http://localhost:2567/health && echo "... ✅ Game сервер работает"
echo ""

echo "✅ Обновление завершено!"
