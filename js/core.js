// js/core.js

let translations = {};

// 1. 解析 TXT 轉為內部 Dict
function parseTranslations(text) {
    const lines = text.split('\n');
    const dict = { 'zh-TW': {}, 'en': {}, 'ja': {} };
    
    lines.forEach(line => {
        if (!line.trim() || line.startsWith('#')) return;
        const parts = line.split('|').map(s => s.trim());
        if (parts.length >= 2) {
            const id = parts[0];
            dict['zh-TW'][id] = parts[1] || id;
            dict['en'][id] = parts[2] || id;
            dict['ja'][id] = parts[3] || id;
        }
    });
    return dict;
}

// 2. 統一掃描函數 (i18n)
window.updateUILS = function(lang) {
    const data = translations[lang] || translations['zh-TW'];
    if (!data) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (data[key]) {
            if (el.tagName === 'INPUT') el.placeholder = data[key];
            else el.innerText = data[key];
        }
    });
    document.documentElement.lang = lang;
};

// 3. 側邊欄開關功能 (掛載到 window 以修復 HTML onclick 報錯)
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    if (sidebar && mainContent) {
        sidebar.classList.toggle('expanded');
        mainContent.classList.toggle('shifted');
    }
};

// 4. 語言切換邏輯
window.onLanguageChange = function(newLang) {
    localStorage.setItem('language', newLang);
    window.updateUILS(newLang);
    // 連動專輯頁面的即時更新
    if (window.updateDiscTranslations) window.updateDiscTranslations(newLang);
};

// 5. 核心初始化 (單一 entry point)
async function initCore() {
    try {
        // A. 抓取並解析翻譯
        const txResp = await fetch('js/translations.txt');
        translations = parseTranslations(await txResp.text());

        // B. 載入側邊欄並初始化行為
        const sideContainer = document.getElementById('sidebar-container');
        if (sideContainer) {
            const sideResp = await fetch('sidebar.html');
            sideContainer.innerHTML = await sideResp.text();
            
            // 設置導覽列 Active 狀態
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            document.querySelectorAll('.sidebar-nav a').forEach(link => {
                if (link.getAttribute('href') === currentPage) link.classList.add('active');
            });

            // 綁定語言選擇器
            const sel = document.getElementById('languageSelect');
            if (sel) {
                const currentLang = localStorage.getItem('language') || 'zh-TW';
                sel.value = currentLang;
                sel.onchange = (e) => window.onLanguageChange(e.target.value);
            }
        }

        // C. 執行第一次翻譯渲染
        window.updateUILS(localStorage.getItem('language') || 'zh-TW');

    } catch (e) {
        console.error("Core initialization failed:", e);
    }
}

// 啟動
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCore);
} else {
    initCore();
}

// 工具函式
window.getTL = (key) => {
    const lang = localStorage.getItem('language') || 'zh-TW';
    return translations[lang]?.[key] || key;
};
