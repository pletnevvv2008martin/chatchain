// Translations for ChatChain

export type Language = 'ru' | 'en';

export const translations = {
  ru: {
    // Header
    chat: 'Чат',
    game: 'Игра',
    dating: 'Знакомства',
    online: 'онлайн',
    register: 'Регистрация',

    // Chat page
    createRoom: 'Создать комнату',
    joinRoom: 'Войти',
    participants: 'участников',
    invite: 'Пригласить',
    enterMessage: 'Введите сообщение...',
    typing: 'печатает...',
    rooms: 'Комнаты',
    lobby: 'Лобби',
    create: 'Создать',
    publicChats: 'Общие чаты',
    privateRooms: 'Приватные',
    publicChat: 'Общий чат',

    // Create Room Modal
    roomName: 'Название комнаты',
    roomPassword: 'Пароль (необязательно)',
    create: 'Создать',
    cancel: 'Отмена',
    enterRoomName: 'Введите название...',
    setPassword: 'Установить пароль',
    enterPasswordPlaceholder: 'Введите пароль...',

    // Password Modal
    enterPassword: 'Введите пароль',
    password: 'Пароль',
    wrongPassword: 'Неверный пароль',
    enterRoom: 'Вход в комнату',
    roomProtected: 'защищена паролем',
    enterBtn: 'Войти',

    // Invite Modal
    inviteUser: 'Пригласить пользователя',
    selectUser: 'Выберите пользователя',
    sendInvite: 'Отправить приглашение',
    inviteToRoom: 'Пригласить в комнату',
    inviteUsersTo: 'Пригласить пользователей в',
    inviteBtn: 'Пригласить',
    noUsersToInvite: 'Нет пользователей для приглашения',

    // Game page
    yourBalance: 'Ваш баланс',
    points: 'баллов',
    invested: 'Инвестировано',
    withdraw: 'Вывести',
    gameLevels: 'Игровые уровни',
    available: 'Доступно',
    occupied: 'Занято',
    completed: 'Завершено',
    join: 'Присоединиться',
    availableNow: 'Доступно сейчас',
    multiplier: 'Множитель',

    // Dating page
    createProfile: 'Создание профиля для знакомств',
    fillProfile: 'Заполните профиль, чтобы участвовать в групповых свиданиях',
    yourGender: 'Ваш пол',
    male: 'Мужской',
    female: 'Женский',
    age: 'Возраст',
    aboutYou: 'О себе',
    tellAboutYourself: 'Расскажите о себе...',
    startDating: 'Начать знакомства',
    participants: 'Участники',
    question: 'Вопрос',
    of: 'из',
    answer: 'Ответить',
    sympathy: 'Симпатия',
    sendSympathy: 'Отправить симпатию',
    selectParticipant: 'Выберите участника',
    pointsAvailable: 'поинтов',
    finalChoice: 'Кому вы понравились?',
    selectOneOrTwo: 'Выберите 1 или 2 участников, которые вам понравились больше всего',
    confirmChoice: 'Подтвердить выбор',
    selected: 'Выбрано',
    calculatingMatches: 'Подсчитываем совпадения...',
    yourMatches: 'Ваши мэтчи!',
    compatibility: 'Совместимость',
    chat: 'Чат',
    notMatched: 'В этот раз не сложилось...',
    tryAgain: 'Попробуйте ещё раз!',
    startOver: 'Начать заново',
    chatWith: 'Чат с',

    // Music player
    music: 'Музыка',
    free: 'Бесплатно',
    priority: 'Приоритет',
    insertYoutubeLink: 'Вставьте ссылку YouTube...',
    insertSoundcloudLink: 'Вставьте ссылку SoundCloud...',
    addedBy: 'Добавил',
    queue: 'Очередь',
    tracks: 'треков',
    insertMusicLink: 'Вставьте ссылку на музыку',
    everyoneWillHear: 'Все услышат одну музыку',
    djControls: 'Управляет',
    becomeDJ: 'Стать DJ',
    queueEmpty: 'Очередь пуста',
    remove: 'Удалить',
    pasteMusicLink: 'Вставьте ссылку (YouTube, SoundCloud, VK, Yandex)',
    vkSearchYoutube: 'Ссылки VK Music нельзя воспроизвести напрямую. Открылась страница поиска на YouTube - найдите песню и вставьте ссылку YouTube.',
    yandexSearchYoutube: 'Ссылки Yandex Music нельзя воспроизвести напрямую. Открылась страница поиска на YouTube - найдите песню и вставьте ссылку YouTube.',

    // User status
    guest: 'Гость',
    participant: 'Участник',
    king: 'Король',
    legend: 'Легенда',

    // Other
    loading: 'Загрузка...',
    send: 'Отправить',
    close: 'Закрыть',
    error: 'Ошибка',
    success: 'Успешно',
  },

  en: {
    // Header
    chat: 'Chat',
    game: 'Game',
    dating: 'Dating',
    online: 'online',
    register: 'Register',

    // Chat page
    createRoom: 'Create Room',
    joinRoom: 'Join',
    participants: 'participants',
    invite: 'Invite',
    enterMessage: 'Enter message...',
    typing: 'is typing...',
    rooms: 'Rooms',
    lobby: 'Lobby',
    create: 'Create',
    publicChats: 'Public Chats',
    privateRooms: 'Private',
    publicChat: 'Public Chat',

    // Create Room Modal
    roomName: 'Room name',
    roomPassword: 'Password (optional)',
    create: 'Create',
    cancel: 'Cancel',
    enterRoomName: 'Enter name...',
    setPassword: 'Set password',
    enterPasswordPlaceholder: 'Enter password...',

    // Password Modal
    enterPassword: 'Enter password',
    password: 'Password',
    wrongPassword: 'Wrong password',
    enterRoom: 'Enter Room',
    roomProtected: 'is password protected',
    enterBtn: 'Enter',

    // Invite Modal
    inviteUser: 'Invite user',
    selectUser: 'Select user',
    sendInvite: 'Send invite',
    inviteToRoom: 'Invite to Room',
    inviteUsersTo: 'Invite users to',
    inviteBtn: 'Invite',
    noUsersToInvite: 'No users available to invite',

    // Game page
    yourBalance: 'Your balance',
    points: 'points',
    invested: 'Invested',
    withdraw: 'Withdraw',
    gameLevels: 'Game levels',
    available: 'Available',
    occupied: 'Occupied',
    completed: 'Completed',
    join: 'Join',
    availableNow: 'Available now',
    multiplier: 'Multiplier',

    // Dating page
    createProfile: 'Create dating profile',
    fillProfile: 'Fill your profile to join group dating',
    yourGender: 'Your gender',
    male: 'Male',
    female: 'Female',
    age: 'Age',
    aboutYou: 'About you',
    tellAboutYourself: 'Tell about yourself...',
    startDating: 'Start Dating',
    participants: 'Participants',
    question: 'Question',
    of: 'of',
    answer: 'Answer',
    sympathy: 'Sympathy',
    sendSympathy: 'Send sympathy',
    selectParticipant: 'Select participant',
    pointsAvailable: 'points',
    finalChoice: 'Who do you like?',
    selectOneOrTwo: 'Select 1 or 2 participants you liked the most',
    confirmChoice: 'Confirm choice',
    selected: 'Selected',
    calculatingMatches: 'Calculating matches...',
    yourMatches: 'Your matches!',
    compatibility: 'Compatibility',
    chat: 'Chat',
    notMatched: 'No matches this time...',
    tryAgain: 'Try again!',
    startOver: 'Start over',
    chatWith: 'Chat with',

    // Music player
    music: 'Music',
    free: 'Free',
    priority: 'Priority',
    insertYoutubeLink: 'Insert YouTube link...',
    insertSoundcloudLink: 'Insert SoundCloud link...',
    addedBy: 'Added by',
    queue: 'Queue',
    tracks: 'tracks',
    insertMusicLink: 'Insert music link',
    everyoneWillHear: 'Everyone will hear the same music',
    djControls: 'DJ',
    becomeDJ: 'Become DJ',
    queueEmpty: 'Queue is empty',
    remove: 'Remove',
    pasteMusicLink: 'Paste link (YouTube, SoundCloud, VK, Yandex)',
    vkSearchYoutube: 'VK Music links are not directly playable. A YouTube search page opened - find your song and paste the YouTube link.',
    yandexSearchYoutube: 'Yandex Music links are not directly playable. A YouTube search page opened - find your song and paste the YouTube link.',

    // User status
    guest: 'Guest',
    participant: 'Participant',
    king: 'King',
    legend: 'Legend',

    // Other
    loading: 'Loading...',
    send: 'Send',
    close: 'Close',
    error: 'Error',
    success: 'Success',
  },
};

export type TranslationKey = keyof typeof translations.ru;

// Get translation
export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || key;
}

// Get all translations for a language
export function getTranslations(lang: Language) {
  return translations[lang];
}
