document.addEventListener('DOMContentLoaded', function() {
    console.log('Main chat loaded');

    const socket = io();

    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const emojiBtn = document.getElementById('emojiBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const emojiPicker = document.getElementById('emojiPicker');
    const typingIndicator = document.getElementById('typingIndicator');
    const onlineCount = document.getElementById('onlineCount');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.querySelector('.theme-icon');

    let currentUser = document.getElementById('userNickname').textContent;
    let typingTimer;
    let isTyping = false;

    // Тема
    const savedTheme = localStorage.getItem('theme') || document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeIcon) themeIcon.textContent = '☀️';
    } else {
        if (themeIcon) themeIcon.textContent = '🌙';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');

            if (themeIcon) {
                themeIcon.textContent = isDark ? '☀️' : '🌙';
            }

            localStorage.setItem('theme', isDark ? 'dark' : 'light');

            fetch('/api/theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme: isDark ? 'dark' : 'light' })
            }).catch(error => console.error('Error saving theme:', error));
        });
    }

    function scrollToBottom() {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    scrollToBottom();

    socket.on('connect', function() {
        console.log('Connected to chat');
    });

    socket.on('online_count', function(data) {
        if (onlineCount) {
            onlineCount.textContent = data.count;
        }
    });

    socket.on('new_message', function(data) {
        console.log('New message:', data);
        addMessage(data);
        scrollToBottom();
    });

    socket.on('user_typing', function(data) {
        if (data.user !== currentUser) {
            if (data.typing) {
                typingIndicator.textContent = `${data.user} печатает...`;
            } else {
                typingIndicator.textContent = '';
            }
        }
    });

    function sendMessage() {
        const content = messageInput.value.trim();
        if (content) {
            socket.emit('send_message', {
                content: content,
                type: 'text'
            });
            messageInput.value = '';
        }
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
                e.preventDefault();
            }

            if (!isTyping) {
                isTyping = true;
                socket.emit('typing', { typing: true });
            }

            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                isTyping = false;
                socket.emit('typing', { typing: false });
            }, 1000);
        });
    }

    if (emojiBtn) {
        emojiBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            emojiPicker.classList.toggle('show');
        });
    }

    const emojiGrid = document.querySelector('.emoji-grid');
    if (emojiGrid) {
        emojiGrid.addEventListener('click', function(e) {
            if (e.target.tagName === 'SPAN') {
                messageInput.value += e.target.textContent;
                emojiPicker.classList.remove('show');
                messageInput.focus();
            }
        });
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    alert('Файл слишком большой (макс. 5MB)');
                    return;
                }

                const formData = new FormData();
                formData.append('file', file);

                uploadBtn.disabled = true;
                uploadBtn.textContent = '⏳';

                fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        socket.emit('send_message', {
                            content: data.url,
                            type: 'image'
                        });
                    }
                })
                .catch(error => console.error('Error:', error))
                .finally(() => {
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = '📎';
                    fileInput.value = '';
                });
            }
        });
    }

    document.addEventListener('click', function(e) {
        if (emojiPicker && emojiBtn && !emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
            emojiPicker.classList.remove('show');
        }
    });

    function addMessage(data) {
        const div = document.createElement('div');
        div.className = `message ${data.user === currentUser ? 'own' : 'other'}`;

        let content = data.content;
        if (data.type === 'image') {
            content = `<img src="${data.content}" onclick="window.open(this.src, '_blank')">`;
        }

        div.innerHTML = `
            <div class="message-header">
                <span class="message-user">${data.user}</span>
                <span class="message-time">${data.time}</span>
            </div>
            <div class="message-content">${content}</div>
        `;

        messagesContainer.appendChild(div);
    }
});
