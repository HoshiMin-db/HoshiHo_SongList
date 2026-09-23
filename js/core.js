// js/core.js

let translations = {};

// TXT 解析器（只有以 ## 開頭的行才會被當成註解忽視）
function parseTranslations(text) {
    const dict = { 'zh-TW': {}, 'en': {}, 'ja': {} };
    const lines = text.split(/\r?\n/);

    let currentKey = null;
    let currentLang = null;
    let contentBuffer = [];

    function saveCurrent() {
        if (currentKey && currentLang) {
            dict[currentLang][currentKey] = contentBuffer.join('\n').trim();
        }
    }

    lines.forEach(line => {
        const trimmedLine = line.trim();

        // 1. 只有以 ## 開頭的行才會被當成系統註解跳過
        if (trimmedLine.startsWith('##')) return;

        // 2. 檢查是否為 [ID] 標題
        const headerMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
        if (headerMatch) {
            saveCurrent();
            currentKey = headerMatch[1].trim();
            currentLang = null;
            contentBuffer = [];
            return;
        }

        // 3. 檢查是否為 語言標籤 (zh-TW:, en:, ja:)
        const langMatch = line.match(/^\s*(zh-TW|en|ja)\s*[:：]\s*(.*)/);
        if (langMatch) {
            saveCurrent();
            currentLang = langMatch[1];
            contentBuffer = [langMatch[2]]; // 冒號後面的內容
            return;
        }

        // 4. 收集普通內文（包含單個 # 的內容，如 #tag 或 # 標題）
        if (currentKey && currentLang) {
            contentBuffer.push(line);
        }
    });

    saveCurrent();
    return dict;
}

// 2. 統一掃描函數 (i18n)
window.updateUILS = function(lang) {
    const data = translations[lang] || translations['zh-TW'];
    if (!data) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (data[key]) {
            // 檢查是否為特殊按鈕（只更新 aria-label，不改顯示文字）
            if (el.id === 'randomButton' || el.id === 'tagToggle') {
                el.setAttribute('aria-label', data[key]);
                el.title = data[key];
            } else if (el.tagName === 'INPUT') {
                el.placeholder = data[key];
            } else {
                el.innerHTML = data[key];
            }
        }
    });
    
    // 更新 tag buttons 的翻譯（替換顯示文字）
    const tagButtons = document.querySelectorAll('#tagButtons .tag-button');
    if (tagButtons.length) {
        tagButtons.forEach(button => {
            const tag = button.dataset.tag || '';
            button.textContent = tag
                ? data[tag] || tag
                : data['allTags'] || button.textContent;
        });
    }
    
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
