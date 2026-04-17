// js/page-tl.js

const translations = {
    'ja': {
        'title': '🌟 HoshiHo 歌曲リスト 💐',
        'totalSongs': '総曲数：',
        'searchPlaceholder': '曲名、歌手、出典、または日付(DDMMYYYY)を検索...',
        'az': 'A-Z',
        'songTitle': '曲名',
        'artist': '歌手',
        'source': '出典',
        'date': '日付',
        // Discography 翻譯
        'discography': '🌟 HoshiHo 作品リスト 💐',
        'sample': '試聴',
        'playlist': 'プレイリスト',
        'purchase': '購入'
    },
    'en': {
        'title': '🌟 HoshiHo Song List 💐',
        'totalSongs': 'Total Songs：',
        'searchPlaceholder': 'Search song name, artist, source, or date (DDMMYYYY)...',
        'az': 'A-Z',
        'songTitle': 'Song Title',
        'artist': 'Artist',
        'source': 'Source',
        'date': 'Date',
        // Discography 翻譯
        'discography': '🌟 HoshiHo Discography 💐',
        'sample': 'Preview',
        'playlist': 'Playlist',
        'purchase': 'Purchase'
    },
    'zh-TW': {
        'title': '🌟 HoshiHo 歌單 💐',
        'totalSongs': '總曲數：',
        'searchPlaceholder': '搜尋歌名、歌手、來源或日期(DDMMYYYY)...',
        'az': 'A-Z',
        'songTitle': '曲名',
        'artist': '歌手',
        'source': '出處',
        'date': '日期',
        // Discography 翻譯
        'discography': '🌟 HoshiHo Discography 💐',
        'sample': '試聽',
        'playlist': '播放清單',
        'purchase': '購買'
    }
};

function setLanguage(lang) {
    // 更新 tab 標題
    document.getElementById('title').innerText = translations[lang]['title']; 
    
    // 更新網頁內的標題
    document.getElementById('pageTitle').innerText = translations[lang]['title'];

    const totalSongsElement = document.getElementById('totalSongs');
    if (totalSongsElement) {
        // 只更新文字部分，保留內部的 <span id="songCount">
        totalSongsElement.firstChild.nodeValue = translations[lang]['totalSongs'];
    }
    
    // 更新其他翻譯內容
    document.getElementById('searchInput').placeholder = translations[lang]['searchPlaceholder'];
    document.querySelector('th.az').innerText = translations[lang]['az'];
    document.querySelector('th.song-title').innerText = translations[lang]['songTitle'];
    document.querySelector('th.artist').innerText = translations[lang]['artist'];
    document.querySelector('th.source').innerText = translations[lang]['source'];
    document.querySelector('th.date-header').innerText = translations[lang]['date'];
}

// 新增：全局翻譯函數（供 disc-generation.js 使用）
function getTranslation(key, lang = null) {
    const targetLang = lang || getCurrentLanguage?.() || 'zh-TW';
    return translations[targetLang]?.[key] || translations['zh-TW'][key] || key;
}

// 新增：取得當前語言
function getCurrentLanguage() {
    return localStorage.getItem('language') || 'zh-TW';
}

// 初始化語言
function initLanguage() {
    const defaultLang = localStorage.getItem('language') || 'zh-TW';
    setLanguage(defaultLang);
}

// 添加語言切換功能
function onLanguageChange(lang) {
    localStorage.setItem('language', lang);
    setLanguage(lang);
    // 重新生成 Discography 頁面（如果存在）
    if (typeof generateDiscography === 'function') {
        generateDiscography();
    }
}

// 導出全局函數
window.getTranslation = getTranslation;
window.getCurrentLanguage = getCurrentLanguage;

// 初始化語言 (延後到 Sidebar 加載後)
document.addEventListener('DOMContentLoaded', function() {
    initLanguage();
});
