"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FANTASY_MAPS = void 0;
exports.getMapTemplate = getMapTemplate;
exports.getRandomMap = getRandomMap;
exports.FANTASY_MAPS = [
    {
        id: 'green_valley',
        name: '🌿 Зелёная Долина',
        description: 'Мирные земли с богатыми ресурсами',
        theme: 'forest',
        monsters: ['🐺 Волки', '🐗 Кабаны', '🦊 Лисы'],
        resources: { gold: 1.2, wood: 1.5, food: 1.3 },
        terrain: ['🌿', '🌲', '🌾', '🏘️', '💧'],
        bgColor: '#1a472a',
        nodeColors: { castle: '#2d5a3d', village: '#3d7a4d', resource: '#4d8a5d' }
    },
    {
        id: 'frozen_peaks',
        name: '❄️ Ледяные Вершины',
        description: 'Холодные горы с редкими кристаллами',
        theme: 'ice',
        monsters: ['🧊 Ледяные големы', '🐺 Снежные волки', '🦅 Белые орлы'],
        resources: { stone: 1.8, mana: 1.5, iron: 1.3 },
        terrain: ['❄️', '🏔️', '🧊', '🌨️', '💧'],
        bgColor: '#1a3a5c',
        nodeColors: { castle: '#2a5a7c', village: '#3a7a9c', resource: '#4a9abc' }
    },
    {
        id: 'volcanic_lands',
        name: '🌋 Вулканические Земли',
        description: 'Опасные земли с редкой магмой',
        theme: 'fire',
        monsters: ['🔥 Огненные элементали', '🐲 Саламандры', '👹 Демоны'],
        resources: { iron: 2.0, gold: 1.5, mana: 1.2 },
        terrain: ['🌋', '🔥', '♨️', '🪨', '💀'],
        bgColor: '#4a1a1a',
        nodeColors: { castle: '#6a2a2a', village: '#8a3a3a', resource: '#aa4a4a' }
    },
    {
        id: 'dark_swamp',
        name: '🕳️ Тёмное Болото',
        description: 'Зловещие топи с древними артефактами',
        theme: 'swamp',
        monsters: ['🐊 Болотоходы', '🧟 Утопленники', '🐍 Гигантские змеи'],
        resources: { mana: 2.0, food: 0.8, gold: 1.0 },
        terrain: ['🕳️', '🌿', '💀', '🍄', '💧'],
        bgColor: '#1a3a2a',
        nodeColors: { castle: '#2a5a3a', village: '#3a6a4a', resource: '#4a7a5a' }
    },
    {
        id: 'desert_dunes',
        name: '🏜️ Пустынные Дюны',
        description: 'Бескрайние пески с древними гробницами',
        theme: 'desert',
        monsters: ['🦂 Скорпионы', '🏜️ Песчаные черви', '💀 Мумии'],
        resources: { gold: 1.8, stone: 1.3, food: 0.7 },
        terrain: ['🏜️', '☀️', '🏛️', '🏜️', '💧'],
        bgColor: '#5a4a2a',
        nodeColors: { castle: '#7a6a3a', village: '#9a8a4a', resource: '#baaa5a' }
    },
    {
        id: 'enchanted_forest',
        name: '🧚 Зачарованный Лес',
        description: 'Магический лес с феями и эльфами',
        theme: 'magic',
        monsters: ['🧚 Феи-проказницы', '🦄 Единороги', '🌳 Энты'],
        resources: { mana: 2.5, wood: 2.0, food: 1.5 },
        terrain: ['🧚', '🌸', '🌳', '✨', '💧'],
        bgColor: '#2a1a4a',
        nodeColors: { castle: '#4a3a6a', village: '#6a5a8a', resource: '#8a7aaa' }
    },
    {
        id: 'undead_realm',
        name: '💀 Царство Нежити',
        description: 'Земли проклятых с древними сокровищами',
        theme: 'undead',
        monsters: ['💀 Скелеты', '👻 Призраки', '🧛 Вампиры'],
        resources: { mana: 1.8, gold: 1.5, iron: 1.2 },
        terrain: ['💀', '⚰️', '🦴', '🌑', '🩸'],
        bgColor: '#1a1a2a',
        nodeColors: { castle: '#3a3a4a', village: '#5a5a6a', resource: '#7a7a8a' }
    },
    {
        id: 'dragon_lair',
        name: '🐉 Логово Драконов',
        description: 'Огненные земли с несметными сокровищами',
        theme: 'dragon',
        monsters: ['🐉 Драконы', '🐲 Виверны', '🔥 Огненные ящеры'],
        resources: { gold: 2.5, stone: 1.5, mana: 1.5 },
        terrain: ['🐉', '🔥', '💎', '🪨', '💰'],
        bgColor: '#3a1a1a',
        nodeColors: { castle: '#5a2a2a', village: '#7a3a3a', resource: '#9a4a4a' }
    },
    {
        id: 'celestial_peaks',
        name: '☁️ Небесные Вершины',
        description: 'Парящие острова с небесными ресурсами',
        theme: 'sky',
        monsters: ['🦅 Грифоны', '👼 Ангелы', '🌈 Элементали воздуха'],
        resources: { mana: 2.2, gold: 1.3, food: 1.0 },
        terrain: ['☁️', '🏝️', '✨', '🦅', '🌈'],
        bgColor: '#1a2a4a',
        nodeColors: { castle: '#3a4a6a', village: '#5a6a8a', resource: '#7a8aaa' }
    },
    {
        id: 'abyss_depths',
        name: '🌊 Бездна Глубин',
        description: 'Подводные пещеры с затонувшими сокровищами',
        theme: 'water',
        monsters: ['🦑 Кракены', '🦈 Морские чудовища', '🧜 Сирены'],
        resources: { gold: 2.0, food: 1.8, mana: 1.3 },
        terrain: ['🌊', '🪸', '🦑', '🐚', '💰'],
        bgColor: '#0a2a3a',
        nodeColors: { castle: '#1a4a5a', village: '#2a6a7a', resource: '#3a8a9a' }
    }
];
// Получить карту по ID
function getMapTemplate(mapId) {
    return exports.FANTASY_MAPS.find(m => m.id === mapId);
}
// Получить случайную карту
function getRandomMap() {
    return exports.FANTASY_MAPS[Math.floor(Math.random() * exports.FANTASY_MAPS.length)];
}
//# sourceMappingURL=fortress-maps.js.map