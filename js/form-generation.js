// ============ form-generation.js - 完整版本 ============

// ============ 防抖函數 ============
function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// ============ 引用 youtube-player.js 中的功能 ============
document.addEventListener("DOMContentLoaded", function () {
    window.closeFloatingPlayer = closeFloatingPlayer;
    window.openFloatingPlayer = openFloatingPlayer;
});

// ============ 字符串規範化函數 ============
import { convert_jp } from "./romaji.js";

// 預編譯的正則表達式（提高效能）
const SYMBOL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?～！＠＃＄％＾＆＊（）＿＋－＝［］｛｝；＇："＼｜，．＜＞／？〜∞→←↑↓]/;
const ENGLISH_REGEX = /[a-zA-Z]/;
const NUMBER_REGEX = /[0-9０-９]/;
const JAPANESE_HIRAGANA = /[\u3040-\u309F]/;
const JAPANESE_KATAKANA = /[\u30A0-\u30FF]/;

function sanitizeInput(input) {
    if (typeof input !== "string") return "";
    return input.replace(/[<>&'"]/g, "")
                .replace(/[\x00-\x1F\x7F]/g, "");
}

function normalizeString(str) {
    if (!str) return "";
    
    str = sanitizeInput(str);
    
    // 只對平假名和片假名進行轉換
    if (JAPANESE_HIRAGANA.test(str) || JAPANESE_KATAKANA.test(str)) {
        str = convert_jp(str);
    }
    
    // 將 (CV.xxx) 改為 (xxx)
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

// ============ 日期工具函數 ============
function isValidDateFormat(dateStr) {
    if (!/^\d{8}$/.test(dateStr)) return false;
    const date = new Date(
        `${dateStr.slice(4)}-${dateStr.slice(2,4)}-${dateStr.slice(0,2)}`
    );
    return date.toISOString().slice(0,10) === `${dateStr.slice(4)}-${dateStr.slice(2,4)}-${dateStr.slice(0,2)}`;
}

function formatDateFromString(dateStr) {
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
}

// ============ 字符類型判斷 ============
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
    return item.song_name.charAt(0);
}

function getSortWeight(type) {
    const weights = {
        symbol: 0,
        number: 1,
        english: 2,
        japanese: 3,
        other: 4,
    };
    return weights[type] ?? weights.other;
}

// ============ 虛擬滾動管理器（核心） ============
class VirtualScrollManager {
    constructor(scrollContainer, tbody, rowHeight = 62) {
        this.scrollContainer = scrollContainer;
        this.tbody = tbody;
        this.rowHeight = rowHeight;
        this.displayedRowsData = [];  // 當前要顯示的完整數據
        this.visibleCount = Math.ceil(scrollContainer.clientHeight / rowHeight) + 5;
        this.lastRenderedStart = -1;
        
        // 綁定滾動事件
        this.scrollContainer.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        window.addEventListener('resize', () => this.recalculateVisible());
    }
    
    /**
     * 設置要顯示的數據（排序/搜尋/篩選後的結果）
     * @param {Array} rowsData - 完整的行數據
     */
    setDisplayData(rowsData) {
        this.displayedRowsData = rowsData;
        
        // 設置總高度（用於正確的滾動條）
        this.tbody.style.height = `${rowsData.length * this.rowHeight}px`;
        
        // 重置滾動位置
        this.scrollContainer.scrollTop = 0;
        
        // 初始渲染
        this.render(0);
    }
    
    handleScroll() {
        const scrollTop = this.scrollContainer.scrollTop;
        const startIdx = Math.floor(scrollTop / this.rowHeight);
        
        // 只在必要時重新渲染（避免頻繁重排）
        if (this.lastRenderedStart !== startIdx && Math.abs(startIdx - this.lastRenderedStart) > 2) {
            requestAnimationFrame(() => this.render(startIdx));
        }
    }
    
    recalculateVisible() {
        this.visibleCount = Math.ceil(this.scrollContainer.clientHeight / this.rowHeight) + 5;
        const scrollTop = this.scrollContainer.scrollTop;
        const startIdx = Math.floor(scrollTop / this.rowHeight);
        this.render(startIdx);
    }
    
    /**
     * 虛擬渲染：只顯示可見範圍的行
     * @param {number} startIdx - 開始索引
     */
    render(startIdx) {
        this.lastRenderedStart = startIdx;
        const endIdx = Math.min(startIdx + this.visibleCount, this.displayedRowsData.length);
        
        // 清空 tbody
        this.tbody.innerHTML = '';
        
        // 只為可見行建立 DOM
        for (let i = startIdx; i < endIdx; i++) {
            const rowData = this.displayedRowsData[i];
            const row = createTableRow(rowData, 3);
            
            // 使用 transform 進行虛擬位移
            row.style.transform = `translateY(${i * this.rowHeight}px)`;
            row.style.position = 'absolute';
            row.style.width = '100%';
            row.style.boxSizing = 'border-box';
            row.style.top = '0';
            row.style.left = '0';
            
            // 保存行索引（用於排序點擊後找到行）
            row.dataset.rowIndex = i;
            
            this.tbody.appendChild(row);
        }
    }
    
    /**
     * 滾動到特定數據索引
     * @param {number} dataIndex - 數據索引
     */
    scrollToDataIndex(dataIndex) {
        const scrollTop = dataIndex * this.rowHeight;
        this.scrollContainer.scrollTop = scrollTop;
    }
    
    /**
     * 獲取特定索引的 DOM 行
     * @param {number} dataIndex - 數據索引
     */
    getRowElement(dataIndex) {
        return this.tbody.querySelector(`[data-row-index="${dataIndex}"]`);
    }
}

// ============ 創建日期儲存格 ============
function createDateCell(row) {
    const dateCell = document.createElement("div");
    dateCell.className = "date-cell";
    
    const link = document.createElement("a");
    const formattedDate = formatDateFromString(row.date);
    link.href = row.link;
    link.textContent = formattedDate;
    link.target = "_blank";
    
    link.onclick = function(event) {
        event.preventDefault();
        if (window.isValidYouTubeURL && window.isValidYouTubeURL(link.href)) {
            window.openFloatingPlayer(link.href);
        } else {
            console.error("Invalid URL or YouTube player not initialized:", link.href);
        }
    };
    
    dateCell.appendChild(link);
    
    // 添加會員專屬鎖定圖標
    if (row.is_member_exclusive) {
        const lockIcon = document.createElement("span");
        lockIcon.classList.add("lock-icon");
        lockIcon.textContent = "🔒";
        dateCell.appendChild(lockIcon);
    }
    
    // 添加 acapella 樣式
    if (row.is_acapella) {
        dateCell.classList.add("acapella");
    }
    
    // 添加私密圖標
    if (row.is_private) {
        const privateIcon = document.createElement("span");
        privateIcon.classList.add("private-icon");
        privateIcon.textContent = "🚫";
        dateCell.appendChild(privateIcon);
    }
    
    return dateCell;
}

// ============ 翻譯 Tag 文本 ============
function getTagTranslation(tag) {
    if (window.getTL && typeof window.getTL === 'function') {
        return window.getTL(tag) || tag;
    }
    return tag;
}

// ============ 創建表格行 ============
function createTableRow(item, numDates) {
    const newRow = document.createElement("tr");
    
    // 第一列：A-Z 分類
    const initialCell = newRow.insertCell();
    initialCell.textContent = item.az || item.song_name.charAt(0).toUpperCase();
    
    // 第二列：曲名 + Tags
    const songNameCell = newRow.insertCell();
    
    const songNameContainer = document.createElement("div");
    
    const songTitle = document.createElement("div");
    songTitle.textContent = item.song_name;
    
    if (item.is_copyright) {
        songTitle.style.color = "red";
    }
    
    songNameContainer.appendChild(songTitle);
    
    // 添加 tags
    if (item.tags && item.tags.length > 0) {
        const tagsDiv = document.createElement("div");
        tagsDiv.className = "song-tags";
        
        item.tags.forEach(tag => {
            const tagSpan = document.createElement("span");
            tagSpan.className = "song-tag";
            tagSpan.dataset.originalTag = tag;
            tagSpan.textContent = getTagTranslation(tag);
            tagsDiv.appendChild(tagSpan);
        });
        
        songNameContainer.appendChild(tagsDiv);
    }
    
    songNameCell.appendChild(songNameContainer);
    
    // 第三列：歌手
    newRow.insertCell().textContent = item.artist;
    
    // 第四列：出處
    newRow.insertCell().textContent = item.source || "";
    
    // 第五列：日期（可滾動）
    const sortedDates = item.dates.sort((a, b) => {
        const dateA = new Date(
            `${a.date.substring(0, 4)}-${a.date.substring(4, 6)}-${a.date.substring(6, 8)}T${a.time}`
        );
        const dateB = new Date(
            `${b.date.substring(0, 4)}-${b.date.substring(4, 6)}-${b.date.substring(6, 8)}T${b.time}`
        );
        return dateB - dateA;
    });
    
    const datesContainerCell = newRow.insertCell();
    datesContainerCell.className = 'dates-container-cell';
    datesContainerCell.colSpan = numDates + 1;
    
    const scrollContainer = document.createElement("div");
    scrollContainer.className = "dates-container";
    
    // 添加初始日期
    const initialDates = sortedDates.slice(0, numDates);
    initialDates.forEach(dateInfo => {
        const dateCell = createDateCell(dateInfo);
        scrollContainer.appendChild(dateCell);
    });
    
    // 如果有更多日期，添加展開按鈕
    if (sortedDates.length > numDates) {
        const moreButton = document.createElement("button");
        moreButton.textContent = "...";
        moreButton.className = "more-button";
        
        let isExpanded = false;
        
        moreButton.onclick = () => {
            if (!isExpanded) {
                // 添加剩餘日期
                sortedDates.slice(numDates).forEach(dateInfo => {
                    const dateCell = createDateCell(dateInfo);
                    dateCell.classList.add("extra-date");
                    scrollContainer.appendChild(dateCell);
                });
                moreButton.textContent = "←";
                isExpanded = true;
            } else {
                // 移除額外日期
                const extraDates = scrollContainer.querySelectorAll(".extra-date");
                extraDates.forEach(cell => cell.remove());
                moreButton.textContent = "...";
                isExpanded = false;
            }
        };
        
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "date-cell";
        buttonContainer.appendChild(moreButton);
        scrollContainer.appendChild(buttonContainer);
    }
    
    datesContainerCell.appendChild(scrollContainer);
    
    return newRow;
}

// ============ 排序數據 ============
function sortData(data, sortConfig = {}) {
    const { column = 'song_name', reverse = false } = sortConfig;
    
    const sorted = [...data].sort((a, b) => {
        let aVal, bVal;
        
        if (column === 'az') {
            aVal = getJapaneseSortKey(a);
            bVal = getJapaneseSortKey(b);
        } else if (column === 'dates') {
            // 按最新日期排序
            const aDate = a.dates && a.dates.length > 0 ? a.dates[0].date : '0';
            const bDate = b.dates && b.dates.length > 0 ? b.dates[0].date : '0';
            aVal = aDate;
            bVal = bDate;
        } else {
            aVal = a[column] || '';
            bVal = b[column] || '';
        }
        
        if (typeof aVal === 'string') {
            aVal = normalizeString(aVal);
            bVal = normalizeString(bVal);
        }
        
        if (aVal > bVal) return reverse ? -1 : 1;
        if (aVal < bVal) return reverse ? 1 : -1;
        return 0;
    });
    
    return sorted;
}

// ============ 主要邏輯 ============
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const scrollContainer = document.getElementById("virtualScrollContainer");
    const songTable = document.getElementById("songTable");
    const songTableBody = songTable.getElementsByTagName("tbody")[0];
    
    // 全局狀態
    let allData = [];
    let totalSongCount = 0;
    let selectedTags = new Set();
    let currentSortConfig = { column: 'song_name', reverse: false };
    let virtualScroller = null;
    
    // ============ 初始化虛擬滾動器 ============
    function initVirtualScroller() {
        if (!virtualScroller) {
            virtualScroller = new VirtualScrollManager(scrollContainer, songTableBody, 62);
        }
    }
    
    // ============ 獲取列名 ============
    function getColumnFromHeader(headerElement) {
        const columnMap = {
            'az': 'az',
            'song-title': 'song_name',
            'artist': 'artist',
            'source': 'source',
            'date-header': 'dates'
        };
        return columnMap[headerElement.className] || 'song_name';
    }
    
    // ============ 設置表格排序點擊事件 ============
    function setupTableHeaderSort() {
        const headers = songTable.querySelectorAll('th');
        
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = getColumnFromHeader(header);
                
                // 切換排序方向
                if (currentSortConfig.column === column) {
                    currentSortConfig.reverse = !currentSortConfig.reverse;
                } else {
                    currentSortConfig.column = column;
                    currentSortConfig.reverse = false;
                }
                
                // 重新排序並顯示
                applyFilters();
            });
        });
    }
    
    // ============ 更新 Tag 過濾 ============
    function updateTagSelection(tag) {
        if (!tag) {
            selectedTags.clear();
        } else {
            if (selectedTags.has(tag)) selectedTags.delete(tag);
            else selectedTags.add(tag);
        }
        
        // 更新按鈕樣式
        document.querySelectorAll('#tagButtons .tag-button').forEach(button => {
            const t = button.dataset.tag;
            if (!t) {
                button.classList.toggle('selected', selectedTags.size === 0);
            } else {
                button.classList.toggle('selected', selectedTags.has(t));
            }
        });
    }
    
    // ============ 創建 Tag 按鈕 ============
    function createTagButton(tag) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tag-button';
        button.dataset.tag = tag;
        button.textContent = tag ? window.getTL(tag) || tag : window.getTL('allTags') || '全部';
        
        if (!tag) {
            if (selectedTags.size === 0) button.classList.add('selected');
        } else if (selectedTags.has(tag)) {
            button.classList.add('selected');
        }
        
        button.addEventListener('click', () => {
            updateTagSelection(tag);
            applyFilters();
        });
        
        return button;
    }
    
    // ============ Tag 排序邏輯 ============
    function sortTagsForDisplay(a, b) {
        const tagOrder = [
            'Showa', '90s', '00s', '10s', '20s',
            'Female', 'Male', 'Anime', 'Game'
        ];
        
        const getPriority = (tag) => {
            const index = tagOrder.indexOf(tag);
            return index !== -1 ? index : 999;
        };
        
        const pa = getPriority(a);
        const pb = getPriority(b);
        
        return pa !== pb ? pa - pb : a.localeCompare(b, 'en');
    }
    
    // ============ 填充 Tag 過濾器 ============
    function populateTagFilter(allTags) {
        const tagButtons = document.getElementById('tagButtons');
        if (!tagButtons) return;
        
        tagButtons.innerHTML = '';
        tagButtons.appendChild(createTagButton(''));
        
        allTags.forEach(tag => {
            tagButtons.appendChild(createTagButton(tag));
        });
    }
    
    // ============ 應用所有過濾和排序 ============
    function applyFilters() {
        const query = normalizeString(searchInput.value.toLowerCase());
        
        // 步驟 1: 搜尋和 Tag 過濾
        const filteredData = allData.filter((row) => {
            let searchMatch = true;
            let tagMatch = true;
            
            // Tag 過濾
            if (selectedTags.size > 0) {
                tagMatch = Array.isArray(row.tags) && 
                          Array.from(selectedTags).every(t => row.tags.includes(t));
            }
            
            // 搜尋過濾
            if (isValidDateFormat(query)) {
                const formattedQuery = `${query.substring(4, 8)}${query.substring(2, 4)}${query.substring(0, 2)}`;
                searchMatch = row.dates.some(date => date.date === formattedQuery);
            } else if (query) {
                searchMatch =
                    normalizeString(row.song_name).includes(query) ||
                    normalizeString(row.artist).includes(query) ||
                    normalizeString(row.source).includes(query);
            }
            
            return searchMatch && tagMatch;
        });
        
        // 步驟 2: 分組相同歌曲
        const groupedData = filteredData.reduce((acc, row) => {
            const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
            if (!acc[key]) {
                acc[key] = { ...row, dates: [] };
            }
            acc[key].dates.push(...row.dates);
            return acc;
        }, {});
        
        // 步驟 3: 排序（默認按字符類型排序）
        let sortedData = Object.values(groupedData).sort((a, b) => {
            const aType = getCharacterType(a.song_name);
            const bType = getCharacterType(b.song_name);
            
            const weightDiff = getSortWeight(aType) - getSortWeight(bType);
            if (weightDiff !== 0) return weightDiff;
            
            if (aType === "japanese" && bType === "japanese") {
                const aKey = getJapaneseSortKey(a);
                const bKey = getJapaneseSortKey(b);
                const groupCompare = aKey.localeCompare(bKey, 'ja-JP');
                if (groupCompare !== 0) return groupCompare;
                return a.song_name.localeCompare(b.song_name, 'ja-JP');
            }
            
            return a.song_name.localeCompare(b.song_name, 'ja-JP');
        });
        
        // 步驟 4: 應用用戶自定義排序
        if (currentSortConfig.column !== 'song_name') {
            sortedData = sortData(sortedData, currentSortConfig);
        }
        
        // 步驟 5: 保存到全局變數（用於隨機選曲）
        window.allDisplayedData = sortedData;
        
        // 步驟 6: 虛擬滾動渲染
        virtualScroller.setDisplayData(sortedData);
    }
    
    // ============ 載入數據 ============
    async function fetchData() {
        try {
            const response = await fetch("data.json", { cache: "no-cache" });
            const data = await response.json();
            
            // 確保 tags 是陣列
            data.forEach(song => {
                if (!song.tags || !Array.isArray(song.tags)) {
                    song.tags = [];
                }
            });
            
            allData = data;
            
            // 計算總曲目數
            totalSongCount = Object.keys(
                data.reduce((acc, row) => {
                    const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
                    acc[key] = true;
                    return acc;
                }, {})
            ).length;
            
            // 初始化虛擬滾動器
            initVirtualScroller();
            
            // 首次應用過濾（會自動渲染）
            applyFilters();
            
            // 更新歌曲總數
            const songCountElement = document.getElementById("songCount");
            if (songCountElement) {
                songCountElement.textContent = totalSongCount;
            }
            
            // 動態生成 tag 按鈕
            const allTags = [...new Set(
                data.flatMap(song => song.tags || [])
            )];
            allTags.sort(sortTagsForDisplay);
            populateTagFilter(allTags);
            
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }
    
    // ============ 搜尋欄輸入事件 ============
    if (searchInput) {
        searchInput.addEventListener("input", debounce(applyFilters, 800));
    }
    
    // ============ 標籤顯示/隱藏切換 ============
    const tagToggle = document.getElementById('tagToggle');
    const tagsFilterContainer = document.getElementById('tagsFilterContainer');
    if (tagToggle && tagsFilterContainer) {
        tagToggle.addEventListener('click', () => {
            const isExpanded = tagToggle.getAttribute('aria-expanded') === 'true';
            tagToggle.setAttribute('aria-expanded', String(!isExpanded));
            tagsFilterContainer.classList.toggle('collapsed');
        });
    }
    
    // ============ 隨機按鈕功能 ============
    const randomButton = document.getElementById('randomButton');
    if (randomButton) {
        const randomText = window.getTL('randomBtn') || '隨機';
        randomButton.setAttribute('aria-label', randomText);
        randomButton.title = randomText;
        
        randomButton.addEventListener('click', () => {
            if (!window.allDisplayedData || window.allDisplayedData.length === 0) return;
            
            // 從當前顯示的數據中隨機選擇
            const randomIndex = Math.floor(Math.random() * window.allDisplayedData.length);
            
            // 滾動到該位置
            virtualScroller.scrollToDataIndex(randomIndex);
            
            // 添加動畫
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
    
    // ============ 語言切換時更新翻譯 ============
    const originalOnLanguageChange = window.onLanguageChange;
    window.onLanguageChange = function(newLang) {
        if (originalOnLanguageChange) {
            originalOnLanguageChange(newLang);
        }
        
        // 更新表格中所有的 tags 翻譯
        document.querySelectorAll('.song-tag').forEach(tagSpan => {
            const originalTag = tagSpan.dataset.originalTag;
            if (originalTag) {
                tagSpan.textContent = getTagTranslation(originalTag);
            }
        });
        
        // 更新過濾按鈕的翻譯
        document.querySelectorAll('#tagButtons .tag-button').forEach(button => {
            const tag = button.dataset.tag;
            button.textContent = tag ? window.getTL(tag) || tag : window.getTL('allTags') || '全部';
        });
    };
    
    // ============ 設置表格排序點擊 ============
    setupTableHeaderSort();
    
    // ============ 初始化：載入數據 ============
    fetchData();
});