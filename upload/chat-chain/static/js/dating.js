document.addEventListener('DOMContentLoaded', function() {
    console.log('Dating.js loaded');

    const socket = io();

    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.querySelector('.theme-icon');
    const searchBtn = document.getElementById('searchDating');
    const stopBtn = document.getElementById('stopDating');
    const waitingStatus = document.getElementById('waitingStatus');
    const datingInterface = document.getElementById('datingInterface');
    const privateChat = document.getElementById('privateChat');
    const privateChatPartner = document.getElementById('privateChatPartner');
    const privateMessages = document.getElementById('privateMessages');
    const privateMessageInput = document.getElementById('privateMessageInput');
    const sendPrivateMessage = document.getElementById('sendPrivateMessage');
    const closePrivateChat = document.getElementById('closePrivateChat');
    const datingPartnerName = document.getElementById('datingPartnerName');
    const partnerStatus = document.getElementById('partnerStatus');
    const questionContainer = document.getElementById('questionContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    const questionText = document.getElementById('questionText');
    const optionsContainer = document.getElementById('optionsContainer');
    const questionProgress = document.getElementById('questionProgress');
    const compatibilityScore = document.getElementById('compatibilityScore');
    const sendSympathyBtn = document.getElementById('sendSympathy');
    const matchNotification = document.getElementById('matchNotification');
    const matchMessage = document.getElementById('matchMessage');
    const openPrivateChat = document.getElementById('openPrivateChat');

    const saveProfileBtn = document.getElementById('saveProfile');
    const editProfileBtn = document.getElementById('editProfile');
    const updateProfileBtn = document.getElementById('updateProfile');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const profileView = document.getElementById('profileView');
    const profileEditForm = document.getElementById('profileEditForm');

    let currentUser = document.querySelector('.user-nickname').textContent;
    let currentRoom = null;
    let currentPartner = null;
    let isWaiting = false;
    let isInDating = false;
    let currentQuestionNum = 0;
    let totalQuestions = 10;
    let privateRoom = null;

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

    socket.on('connect', function() {
        console.log('Connected to dating server');
    });

    socket.on('dating_waiting', function() {
        console.log('Waiting for partner...');
        isWaiting = true;
        updateUI('waiting');
    });

    socket.on('dating_started', function(data) {
        console.log('Dating started:', data);
        isWaiting = false;
        isInDating = true;
        currentRoom = data.room_id;
        currentPartner = data.partner;
        currentQuestionNum = data.question_num;
        totalQuestions = data.total;

        updateUI('in_dating');
        datingPartnerName.textContent = data.partner;
        showQuestion(data.question, currentQuestionNum);
    });

    socket.on('next_question', function(data) {
        console.log('Next question:', data);
        currentQuestionNum = data.question_num;
        showQuestion(data.question, currentQuestionNum);

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = false;
        });
    });

    socket.on('dating_results', function(data) {
        console.log('Dating results:', data);
        questionContainer.style.display = 'none';
        resultsContainer.style.display = 'block';

        compatibilityScore.innerHTML = `
            <div class="score-circle">
                <span class="score-value">${data.compatibility}%</span>
                <span class="score-label">совместимость</span>
            </div>
        `;
    });

    socket.on('dating_match', function(data) {
        console.log('Dating match:', data);

        privateRoom = data.room_id;
        privateChatPartner.textContent = data.partner;

        matchNotification.style.display = 'flex';
        matchMessage.textContent = data.message;

        socket.emit('join_private', { room: privateRoom });

        setTimeout(() => {
            matchNotification.style.display = 'none';
        }, 5000);

        resetDating();
    });

    socket.on('partner_left_dating', function() {
        alert('Партнер покинул комнату');
        resetDating();
    });

    socket.on('private_message', function(data) {
        if (privateChat.style.display === 'block') {
            addPrivateMessage(data.user, data.content, data.time);
        }
    });

    socket.on('partner_typing', function(data) {
        if (privateChat.style.display === 'block' && data.user !== currentUser) {
            partnerStatus.textContent = 'печатает...';
            setTimeout(() => {
                partnerStatus.textContent = 'онлайн';
            }, 1000);
        }
    });

    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            fetch('/api/dating/profile')
                .then(response => {
                    if (response.status === 404) {
                        alert('Сначала создайте профиль');
                        throw new Error('No profile');
                    }
                    return response.json();
                })
                .then(() => {
                    fetch('/api/dating/start', { method: 'POST' })
                        .then(response => response.json())
                        .then(data => {
                            if (data.error) {
                                alert(data.error);
                            } else if (data.status === 'waiting') {
                                isWaiting = true;
                                updateUI('waiting');
                            }
                        });
                })
                .catch(() => {});
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', function() {
            fetch('/api/dating/leave', { method: 'POST' })
                .then(() => resetDating());
        });
    }

    if (sendSympathyBtn) {
        sendSympathyBtn.addEventListener('click', function() {
            if (!currentPartner) return;

            fetch('/api/dating/sympathy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to_user: currentPartner })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('❤️ Симпатия отправлена!');
                    sendSympathyBtn.disabled = true;
                }
            });
        });
    }

    if (openPrivateChat) {
        openPrivateChat.addEventListener('click', function() {
            matchNotification.style.display = 'none';
            openPrivateChatWindow();
        });
    }

    document.querySelectorAll('.match-item').forEach(item => {
        item.addEventListener('click', function() {
            const partner = this.dataset.partner;
            const room = this.dataset.room;
            privateRoom = room;
            privateChatPartner.textContent = partner;
            socket.emit('join_private', { room: privateRoom });
            openPrivateChatWindow();
        });
    });

    if (closePrivateChat) {
        closePrivateChat.addEventListener('click', function() {
            privateChat.style.display = 'none';
            datingInterface.style.display = 'block';
        });
    }

    function sendPrivateMsg() {
        const content = privateMessageInput.value.trim();
        if (content && privateRoom) {
            socket.emit('private_message', {
                room: privateRoom,
                user: currentUser,
                content: content
            });
            addPrivateMessage(currentUser, content, new Date().toLocaleTimeString());
            privateMessageInput.value = '';
        }
    }

    if (sendPrivateMessage) {
        sendPrivateMessage.addEventListener('click', sendPrivateMsg);
    }

    if (privateMessageInput) {
        privateMessageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendPrivateMsg();
            }
            socket.emit('private_typing', {
                room: privateRoom,
                user: currentUser
            });
        });
    }

    function addPrivateMessage(user, content, time) {
        const div = document.createElement('div');
        div.className = `message ${user === currentUser ? 'own' : 'other'}`;
        div.innerHTML = `
            <div class="message-header">
                <span class="message-user">${user}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${content}</div>
        `;
        privateMessages.appendChild(div);
        privateMessages.scrollTop = privateMessages.scrollHeight;
    }

    function openPrivateChatWindow() {
        datingInterface.style.display = 'none';
        waitingStatus.style.display = 'none';
        privateChat.style.display = 'block';
        privateMessages.innerHTML = '';
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            const age = document.getElementById('age').value;
            const gender = document.getElementById('gender').value;
            const bio = document.getElementById('bio').value;

            if (!age || !gender || !bio) {
                alert('Заполните все поля');
                return;
            }

            fetch('/api/dating/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ age: parseInt(age), gender, bio, answers: {} })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                }
            });
        });
    }

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            profileView.style.display = 'none';
            profileEditForm.style.display = 'block';
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function() {
            profileView.style.display = 'block';
            profileEditForm.style.display = 'none';
        });
    }

    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', function() {
            const age = document.getElementById('editAge').value;
            const gender = document.getElementById('editGender').value;
            const bio = document.getElementById('editBio').value;

            fetch('/api/dating/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ age: parseInt(age), gender, bio, answers: {} })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                }
            });
        });
    }

    function showQuestion(question, num) {
        questionText.textContent = `Вопрос ${num}/${totalQuestions}: ${question.question}`;
        questionProgress.style.width = `${(num / totalQuestions) * 100}%`;

        optionsContainer.innerHTML = '';
        question.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = option;
            btn.onclick = () => submitAnswer(question.id, option);
            optionsContainer.appendChild(btn);
        });
    }

    function submitAnswer(questionId, answer) {
        if (!currentRoom) return;

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
        });

        fetch('/api/dating/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room_id: currentRoom,
                question_id: questionId,
                answer: answer
            })
        });
    }

    function resetDating() {
        isWaiting = false;
        isInDating = false;
        currentRoom = null;
        currentPartner = null;
        updateUI('idle');
    }

    function updateUI(state) {
        searchBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        waitingStatus.style.display = 'none';
        datingInterface.style.display = 'none';

        if (state === 'waiting') {
            searchBtn.style.display = 'none';
            stopBtn.style.display = 'flex';
            waitingStatus.style.display = 'block';
        } else if (state === 'in_dating') {
            searchBtn.style.display = 'none';
            stopBtn.style.display = 'flex';
            datingInterface.style.display = 'block';
            questionContainer.style.display = 'block';
            resultsContainer.style.display = 'none';
        } else {
            searchBtn.style.display = 'flex';
        }
    }
});
