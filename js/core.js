// js/core.js

let translations = {};

// 1. 解析 TXT 轉為內部 Dict
function parseTranslations(text) {
    const lines = text.split('\n');
    const dict = { 'zh-TW': {}, 'en': {}, 'ja': {} };
    
    lines.forEach(line => {
        if (!line || line.startsWith('#')) return;
        const [id, zh, en, ja] = line.split('|').map(s => s.trim());
        if (id) {
            dict['zh-TW'][id] = zh;
            dict['en'][id] = en;
            dict['ja'][id] = ja;
        }
    });
    return dict;
}

// 2. 統一掃描函數 (i18n)
window.updateUILS = function(lang) {
    const data = translations[lang] || translations['zh-TW'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (data[key]) {
            // 如果是輸入框則改 placeholder，否則改 innerText
            if (el.tagName === 'INPUT') el.placeholder = data[key];
            else el.innerText = data[key];
        }
    });
    // 同步更新 <html> 的 lang 屬性
    document.documentElement.lang = lang;
};

// 3. 核心初始化 (鏈式執行)
async function initCore() {
    try {
        // A. 抓取並解析翻譯
        const txResp = await fetch('js/translations.txt');
        translations = parseTranslations(await txResp.text());

        // B. 載入側邊欄 (如果頁面有容器)
        const sideContainer = document.getElementById('sidebar-container');
        if (sideContainer) {
            const sideResp = await fetch('sidebar.html');
            sideContainer.innerHTML = await sideResp.text();
            
            // 綁定側邊欄切換事件 (假設 ID 是 languageSelect)
            const sel = document.getElementById('languageSelect');
            if (sel) {
                sel.value = localStorage.getItem('language') || 'zh-TW';
                sel.onchange = (e) => {
                    const newLang = e.target.value;
                    localStorage.setItem('language', newLang);
                    updateUILS(newLang);
                    // 如果 disc.js 存在則通知它
                    if (window.updateDiscTranslations) window.updateDiscTranslations(newLang);
                };
            }
        }

        // C. 執行第一次翻譯渲染
        updateUILS(localStorage.getItem('language') || 'zh-TW');

    } catch (e) {
        console.error("Initialization failed:", e);
    }
}

// 啟動 (配合 defer 屬性)
initCore();

// 提供給其他 JS (如 disc-generation) 獲取單個詞條的工具
window.getTL = (key) => {
    const lang = localStorage.getItem('language') || 'zh-TW';
    return translations[lang]?.[key] || key;
};
