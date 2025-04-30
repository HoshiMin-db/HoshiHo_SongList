// js/page-tl.js

const translations = {
    'ja': {
        'title': '🌟 HoshiHo 歌曲リスト 💐',
        'totalSongs': '総曲数：',
        'searchPlaceholder': '曲名、歌手、出典、または日付(DDMMYYYY)を検索...',
        'closeButton': '閉じる',
        'az': 'A-Z',
        'songTitle': '曲名',
        'artist': '歌手',
        'source': '出典',
        'date': '日付'
    },
    'en': {
        'title': '🌟 HoshiHo Song List 💐',
        'totalSongs': 'Total Songs:',
        'searchPlaceholder': 'Search song name, artist, source, or date (DDMMYYYY)...',
        'closeButton': 'Close',
        'az': 'A-Z',
        'songTitle': 'Song Title',
        'artist': 'Artist',
        'source': 'Source',
        'date': 'Date'
    },
    'zh-TW': {
        'title': '🌟 HoshiHo 歌單 💐',
        'totalSongs': '總曲數：',
        'searchPlaceholder': '搜尋歌名、歌手、來源或日期(DDMMYYYY)...',
        'closeButton': '關閉',
        'az': 'A-Z',
        'songTitle': '曲名',
        'artist': '歌手',
        'source': '出處',
        'date': '日期'
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
    document.querySelector('.close-btn').innerText = translations[lang]['closeButton'];
    document.querySelector('th.az').innerText = translations[lang]['az'];
    document.querySelector('th.song-title').innerText = translations[lang]['songTitle'];
    document.querySelector('th.artist').innerText = translations[lang]['artist'];
    document.querySelector('th.source').innerText = translations[lang]['source'];
    document.querySelector('th.date-header').innerText = translations[lang]['date'];
}

// 初始化語言
function initLanguage() {
    const defaultLang = 'zh-TW';
    setLanguage(defaultLang);
}

// 添加語言切換功能
function onLanguageChange(lang) {
    setLanguage(lang);
}

// 初始化語言 (延後到 Sidebar 加載後)
document.addEventListener('DOMContentLoaded', function() {
    initLanguage();
});
