// ==================== js/form-generation.js (合併優化版) ====================
import { convert_jp } from "./romaji.js";

// ==================== [ 第一區：全域通用工具與正規化 ] ====================
// 防抖函數
function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 引用 youtube-player.js 全域綁定
document.addEventListener("DOMContentLoaded", function () {
    window.closeFloatingPlayer = closeFloatingPlayer;
    window.openFloatingPlayer = openFloatingPlayer;
});

// 字串處理與日文正規化工具 (已移除重複段落，兩邊共用)
const SYMBOL_REGEX = /[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\/?～！＠＃＄％＾＆＊（）＿＋－＝［］｛｝；＇：\"＼｜，．＜＞／？〜∞→←↑↓]/;
const ENGLISH_REGEX = /[a-zA-Z]/;
const NUMBER_REGEX = /[0-9０-９]/;
const JAPANESE_HIRAGANA = /[\u3040-\u309F]/;
const JAPANESE_KATAKANA = /[\u30A0-\u30FF]/;

function sanitizeInput(input) {
    if (typeof input !== "string") return "";
    return input.replace(/[<>&'\"]/g, "")
                .replace(/[\x00-\x1F\x7F]/g, "");
}

function normalizeString(str) {
    if (!str) return "";
    str = sanitizeInput(str);
    if (JAPANESE_HIRAGANA.test(str) || JAPANESE_KATAKANA.test(str)) {
        str = convert_jp(str);
    }
    str = str.replace(/\(cv\.(.*?)\)/gi, "($1)");
    return str
        .normalize("NFKC")
        .replace(/[~\u301c\uff5e]/g, "~")
        .replace(/，/g, ",")
        .replace(/。/g, ".")
        .replace(/['']/g, "'")
        .replace(/…/g, "...")
        .replace(/\s+/g, "")
        .toLowerCase();
}

function isValidDateFormat(str) {
    return /^\d{8}$/.test(str);
}

function formatDateFromString(dateStr) {
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
}

function getCharacterType(text) {
    if (!text) return "other";
    const firstChar = text.trim().charAt(0);
    if (!firstChar) return "other";
    if (SYMBOL_REGEX.test(firstChar)) return "symbol";
    if (ENGLISH_REGEX.test(firstChar)) return "english";
    if (NUMBER_REGEX.test(firstChar)) return "number";
    return "japanese";
}

function getJapaneseSortKey(item) {
    if (item.az) return item.az;
    return item.song_title || "";
}

// ==================== [ 第二區：主程式與虛擬滾動邏輯 ] ====================
document.addEventListener("DOMContentLoaded", function () {
    let virtualScroller = null;
    let searchBarManager = null;
    
    // 透過表格欄位進行排序的狀態
    let currentSortField = null; // 'az', 'title', 'artist', 'source', 'date'
    let currentSortOrder = 'asc'; // 'asc' 或 'desc'

    // 初始化快取多國語言翻譯
    const originalTagsText = window.getTL('filterByTag') || '篩選 Tag：';
    const tagLabelSpan = document.querySelector('.search-container .tag-toggle-wrapper span');
    if (tagLabelSpan) tagLabelSpan.textContent = originalTagsText;

    function getTagTranslation(tag) {
        if (!tag) return '';
        return window.getTL(tag) || tag;
    }

    // 取得資料並初始化網頁
    async function fetchData() {
        try {
            const response = await fetch("data.json", { cache: "no-cache" });
            const json = await response.json();
            
            // 資料清洗與預先計算正規化欄位
            window.allSongData = json.map(item => {
                if (!item.tags) item.tags = [];
                
                // 預先算出供搜尋用的快取欄位，避免在輸入時重複計算
                item._search_title = normalizeString(item.song_title);
                item._search_artist = normalizeString(item.artist);
                item._search_source = normalizeString(item.source);
                item._search_date = item.date ? item.date.replace(/\//g, "") : "";
                
                // 排序用的規範化 key
                item._sort_title = normalizeString(getJapaneseSortKey(item));
                item._sort_artist = normalizeString(item.artist || "");
                item._sort_source = normalizeString(item.source || "");
                
                return item;
            });

            // 收集所有不重複的 Tags
            const tagsSet = new Set();
            window.allSongData.forEach(item => {
                if (Array.isArray(item.tags)) {
                    item.tags.forEach(t => { if(t) tagsSet.add(t); });
                }
            });
            const uniqueTags = Array.from(tagsSet);

            // 初始化虛擬滾動實例
            const container = document.getElementById("virtualScrollContainer");
            const tbody = document.querySelector("#songTable tbody");
            
            if (window.VirtualScroller) {
                virtualScroller = new window.VirtualScroller({
                    containerElement: container,
                    tbodyElement: tbody,
                    rowHeight: 53,
                    bufferCount: 5,
                    renderRow: createTableRow
                });
            }

            // 🛠️ 核心變更：直接在此 new 本地合併後的 SearchBarManager
            searchBarManager = new SearchBarManager({
                onUpdate: () => {
                    applyFilters();
                }
            });

            // 產生 Tag 按鈕
            searchBarManager.populateTagFilter(uniqueTags);

            // 執行初始排序與第一次篩選渲染
            sortData('japanese', 'asc', false); 
            applyFilters();

            // 綁定表頭點擊排序事件
            setupTableHeaderSort();
            // 綁定隨機按鈕事件
            setupRandomButton();

        } catch (error) {
            console.error("Error loading song data:", error);
        }
    }

    // 建立單一表格列 DOM 結構
    function createTableRow(item) {
        const tr = document.createElement("tr");
        
        const tdAz = document.createElement("td");
        tdAz.className = "az";
        tdAz.textContent = item.az || "";
        tr.appendChild(tdAz);

        const tdTitle = document.createElement("td");
        tdTitle.className = "song-title";
        if (item.song_link) {
            const a = document.createElement("a");
            a.href = "#";
            a.textContent = item.song_title;
            a.addEventListener("click", (e) => {
                e.preventDefault();
                if (typeof window.openFloatingPlayer === "function") {
                    window.openFloatingPlayer(item.song_link);
                }
            });
            tdTitle.appendChild(a);
        } else {
            tdTitle.textContent = item.song_title;
        }
        tr.appendChild(tdTitle);

        const tdArtist = document.createElement("td");
        tdArtist.className = "artist";
        tdArtist.textContent = item.artist || "";
        tr.appendChild(tdArtist);

        const tdSource = document.createElement("td");
        tdSource.className = "source";
        tdSource.textContent = item.source || "";
        tr.appendChild(tdSource);

        const tdDate = document.createElement("td");
        tdDate.className = "date-cell";
        tdDate.textContent = item.date || "";
        tr.appendChild(tdDate);

        // 渲染 Tags 欄位
        const tdTags = document.createElement("td");
        tdTags.className = "tags-cell";
        if (Array.isArray(item.tags)) {
            item.tags.forEach(tag => {
                if (!tag) return;
                const span = document.createElement("span");
                span.className = "song-tag";
                span.dataset.originalTag = tag;
                span.textContent = getTagTranslation(tag);
                tdTags.appendChild(span);
            });
        }
        tr.appendChild(tdTags);

        return tr;
    }

    // 核心篩選過濾器
    function applyFilters() {
        if (!window.allSongData) return;

        // 從合併後的搜尋管理器取得目前的輸入狀態
        const searchVal = searchBarManager ? searchBarManager.getSearchValue() : "";
        const selectedTags = searchBarManager ? searchBarManager.getSelectedTags() : new Set();

        let filtered = window.allSongData;

        // 1. 標籤篩選
        if (selectedTags.size > 0) {
            filtered = filtered.filter(item => 
                item.tags && Array.from(selectedTags).every(t => item.tags.includes(t))
            );
        }

        // 2. 關鍵字關鍵篩選
        if (searchVal) {
            if (isValidDateFormat(searchVal)) {
                // 如果是 8 位數純數字，精準比對日期
                filtered = filtered.filter(item => item._search_date.includes(searchVal));
            } else {
                // 字串模糊比對
                filtered = filtered.filter(item => 
                    item._search_title.includes(searchVal) ||
                    item._search_artist.includes(searchVal) ||
                    item._search_source.includes(searchVal)
                );
            }
        }

        window.allDisplayedData = filtered;

        // 更新總曲數計數器
        const songCountEl = document.getElementById("songCount");
        if (songCountEl) songCountEl.textContent = filtered.length;

        // 將篩選後的資料餵給虛擬滾動更新畫面
        if (virtualScroller) {
            virtualScroller.updateData(filtered);
        }
    }

    // 數據排序核心
    function sortData(type, order = 'asc', performFilter = true) {
        if (!window.allSongData) return;
        
        const modifier = order === 'asc' ? 1 : -1;

        window.allSongData.sort((a, b) => {
            // A-Z 區域名稱首字群組排序
            if (type === 'japanese') {
                const typeA = getCharacterType(getJapaneseSortKey(a));
                const typeB = getCharacterType(getJapaneseSortKey(b));
                
                const typeOrder = { "symbol": 1, "number": 2, "english": 3, "japanese": 4, "other": 5 };
                if (typeA !== typeB) {
                    return typeOrder[typeA] - typeOrder[typeB];
                }
                
                return a._sort_title.localeCompare(b._sort_title, 'ja') * modifier;
            }

            // 欄位點擊常規排序
            let valA = "", valB = "";
            if (type === 'title') { valA = a._sort_title; valB = b._sort_title; }
            else if (type === 'artist') { valA = a._sort_artist; valB = b._sort_artist; }
            else if (type === 'source') { valA = a._sort_source; valB = b._sort_source; }
            else if (type === 'date') {
                valA = a.date ? a.date.split('/').reverse().join('') : '00000000';
                valB = b.date ? b.date.split('/').reverse().join('') : '00000000';
            }

            return valA.localeCompare(valB, 'ja') * modifier;
        });

        if (performFilter) {
            applyFilters();
        }
    }

    // 綁定點擊欄位標頭排序邏輯
    function setupTableHeaderSort() {
        const headers = {
            '.az': 'japanese',
            '.song-title': 'title',
            '.artist': 'artist',
            '.source': 'source',
            '.date-header': 'date'
        };

        Object.entries(headers).forEach(([selector, field]) => {
            const th = document.querySelector(`#songTable thead th${selector}`);
            if (!th) return;

            // 移除舊的監聽器防止重複綁定
            th.replaceWith(th.cloneNode(true));
            const newTh = document.querySelector(`#songTable thead th${selector}`);

            newTh.addEventListener('click', () => {
                if (currentSortField === field) {
                    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSortField = field;
                    currentSortOrder = 'asc';
                }

                // 清除所有欄位激活狀態樣式
                document.querySelectorAll('#songTable thead th').forEach(el => el.classList.remove('sort-asc', 'sort-desc'));
                newTh.classList.add(currentSortOrder === 'asc' ? 'sort-asc' : 'sort-desc');

                sortData(field, currentSortOrder, true);
            });
        });
    }

    // 隨機抽選按鈕功能
    function setupRandomButton() {
        const randomButton = document.getElementById('randomButton');
        if (!randomButton) return;
        
        const randomText = window.getTL('randomBtn') || '隨機';
        randomButton.setAttribute('aria-label', randomText); 
        randomButton.title = randomText;
        
        randomButton.addEventListener('click', () => {
            if (!window.allDisplayedData || window.allDisplayedData.length === 0) return;
            
            const randomIndex = Math.floor(Math.random() * window.allDisplayedData.length);
            virtualScroller.scrollToDataIndex(randomIndex);
            
            setTimeout(() => {
                const row = virtualScroller.getRowElement(randomIndex);
                if (row) {
                    row.classList.add('blink-animation');
                    setTimeout(() => {
                        row.classList.remove('blink-animation');
                    }, 3800);
                }
            }, 800);
        });
    }
    
    // 語言切換同步處理
    const originalOnLanguageChange = window.onLanguageChange;
    window.onLanguageChange = function(newLang) {
        if (originalOnLanguageChange) {
            originalOnLanguageChange(newLang);
        }
        
        document.querySelectorAll('.song-tag').forEach(tagSpan => {
            const originalTag = tagSpan.dataset.originalTag;
            if (originalTag) {
                tagSpan.textContent = getTagTranslation(originalTag);
            }
        });
        
        document.querySelectorAll('#tagButtons .tag-button').forEach(button => {
            const tag = button.dataset.tag;
            button.textContent = tag ? window.getTL(tag) || tag : window.getTL('allTags') || '全部';
        });
    };
    
    fetchData();
});

// ==================== [ 第三區：搜尋與 Tag 篩選面板管理器 ] ====================
class SearchBarManager {
    constructor(options) {
        this.onUpdate = options.onUpdate || function() {};
        this.selectedTags = new Set();
        
        // 抓取 DOM 元素
        this.searchInput = document.getElementById('searchInput');
        this.tagToggle = document.getElementById('tagToggle');
        this.tagButtons = document.getElementById('tagButtons');
        
        this.initEvents();
    }

    getSearchValue() {
        return this.searchInput ? normalizeString(this.searchInput.value) : "";
    }

    getSelectedTags() {
        return this.selectedTags;
    }

    initEvents() {
        // 輸入框防抖監聽 (300ms)
        if (this.searchInput) {
            this.searchInput.addEventListener('input', debounce(() => {
                this.onUpdate();
            }, 300));
        }

        // Tag 展開收摺按鈕
        if (this.tagToggle && this.tagButtons) {
            this.tagToggle.addEventListener('click', () => {
                const isExpanded = this.tagToggle.getAttribute('aria-expanded') === 'true';
                this.tagToggle.setAttribute('aria-expanded', !isExpanded);
                this.tagButtons.classList.toggle('show', !isExpanded);
            });
        }
    }

    // 更新選取的標籤集合狀態
    updateTagSelection(tag) {
        if (!tag) {
            // 點擊「全部」則清空所有選取
            this.selectedTags.clear();
        } else {
            if (this.selectedTags.has(tag)) {
                this.selectedTags.delete(tag);
            } else {
                this.selectedTags.add(tag);
            }
        }
        this.syncTagButtonStyles();
    }

    // 重新整理標籤按鈕的 CSS 選取樣式
    syncTagButtonStyles() {
        if (this.tagButtons) {
            this.tagButtons.querySelectorAll('.tag-button').forEach(button => {
                const t = button.dataset.tag;
                if (!t) {
                    button.classList.toggle('selected', this.selectedTags.size === 0);
                } else {
                    button.classList.toggle('selected', this.selectedTags.has(t));
                }
            });
        }
    }

    // 建立單個標籤按鈕 DOM
    createTagButton(tag) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tag-button';
        button.dataset.tag = tag;
        button.textContent = tag ? window.getTL(tag) || tag : window.getTL('allTags') || '全部';
        
        if (!tag) {
            if (this.selectedTags.size === 0) button.classList.add('selected');
        } else if (this.selectedTags.has(tag)) {
            button.classList.add('selected');
        }
        
        button.addEventListener('click', () => {
            this.updateTagSelection(tag);
            this.onUpdate(); // 觸發主程式重新篩選列表
        });
        
        return button;
    }

    // 動態渲染所有標籤按鈕
    populateTagFilter(allTags) {
        if (!this.tagButtons) return;
        
        this.tagButtons.innerHTML = '';
        
        // 優先置入「全部」按鈕
        const allButton = this.createTagButton('');
        this.tagButtons.appendChild(allButton);
        
        // 依序置入其餘標籤
        allTags.forEach(tag => {
            if (tag) {
                const btn = this.createTagButton(tag);
                this.tagButtons.appendChild(btn);
            }
        });
    }
}
