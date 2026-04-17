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
        'discography': '🌟 HoshiHo 專輯 💐',
        'sample': '試聽',
        'playlist': '播放清單',
        'purchase': '購買'
    }
};

function setLanguage(lang) {
    const data = translations[lang];
    if (!data) return;

    // 使用可選鏈或條件判斷
    const titleEl = document.getElementById('title');
    if (titleEl) titleEl.innerText = data['title'];

    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl) pageTitleEl.innerText = data['title'];

    const totalSongsElement = document.getElementById('totalSongs');
    if (totalSongsElement && totalSongsElement.firstChild) {
        totalSongsElement.firstChild.nodeValue = data['totalSongs'];
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = data['searchPlaceholder'];

    // 表格標題防錯
    const thAz = document.querySelector('th.az');
    if (thAz) thAz.innerText = data['az'];
    
    const thSong = document.querySelector('th.song-title');
    if (thSong) thSong.innerText = data['songTitle'];
    
    const thArtist = document.querySelector('th.artist');
    if (thArtist) thArtist.innerText = data['artist'];
    
    const thSource = document.querySelector('th.source');
    if (thSource) thSource.innerText = data['source'];
    
    const thDate = document.querySelector('th.date-header');
    if (thDate) thDate.innerText = data['date'];
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
    
    // 如果在 disc.html 頁面，只更新翻譯文字，不重新生成卡片
    if (typeof updateDiscTranslations === 'function') {
        updateDiscTranslations(lang);
    }
}

// 導出全局函數
window.getTranslation = getTranslation;
window.getCurrentLanguage = getCurrentLanguage;

// 初始化語言 (延後到 Sidebar 加載後)
document.addEventListener('DOMContentLoaded', function() {
    initLanguage();
});
