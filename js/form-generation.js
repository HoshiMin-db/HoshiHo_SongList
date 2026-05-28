// ==================== js/form-generation.js ====================
import { convert_jp } from "./romaji.js";

// ==================== [ 第一區：全域通用工具與正規化 ] ====================
// 字符類型判定正規表達式
const SYMBOL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?～！＠＃＄％＾＆＊（）＿＋－＝［］｛｝；＇："＼｜，．＜＞／？〜∞→←↑↓]/;
const ENGLISH_REGEX = /[a-zA-Z]/;
const NUMBER_REGEX = /[0-9０-９]/;
const JAPANESE_HIRAGANA = /[\u3040-\u309F]/;
const JAPANESE_KATAKANA = /[\u30A0-\u30FF]/;

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

// ==================== [ 字串淨化與正規化工具 ] ====================
function sanitizeInput(input) {
    if (typeof input !== "string") return "";
    return input.replace(/[<>&'"]/g, "")
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

function getCharacterType(text) {
    if (!text) return "other";
    const firstChar = text.trim().charAt(0);
    if (!firstChar) return "other";
    if (SYMBOL_REGEX.test(firstChar)) return "symbol";
    if (ENGLISH_REGEX.test(firstChar)) return "english";
    if (NUMBER_REGEX.test(firstChar)) return "number";
    return "japanese";
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

function getJapaneseSortKey(item) {
    if (item.az) return item.az;
    return item.song_name ? item.song_name.charAt(0) : "";
}

// ==================== [ 虛擬滾動管理器 ] ====================
class VirtualScrollManager {
    constructor(scrollContainer, tbody, rowHeight = 62) {
        this.scrollContainer = scrollContainer;
        this.tbody = tbody;
        this.rowHeight = rowHeight;
        this.displayedRowsData = [];
        this.visibleCount = Math.ceil(scrollContainer.clientHeight / rowHeight);
        this.lastRenderedStart = -1;
        this.domRowsMap = new Map();
        this.ticking = false;
        
        this.scrollContainer.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        window.addEventListener('resize', () => this.recalculateVisible());
    }
    
    setDisplayData(rowsData) {
        this.displayedRowsData = rowsData;
        this.domRowsMap.clear();
        this.tbody.style.minHeight = `${rowsData.length * this.rowHeight}px`;
        this.scrollContainer.scrollTop = 0;
        this.lastRenderedStart = -1;
        this.render(0);
    }
    
    handleScroll() {
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                const scrollTop = this.scrollContainer.scrollTop;
                const currentBaseStartIdx = Math.floor(scrollTop / this.rowHeight);
                if (Math.abs(currentBaseStartIdx - this.lastRenderedStart) >= 1) {
                    this.render(currentBaseStartIdx);
                }
                this.ticking = false;
            });
            this.ticking = true;
        }
    }
    
    recalculateVisible() {
        this.visibleCount = Math.ceil(this.scrollContainer.clientHeight / this.rowHeight);
        const scrollTop = this.scrollContainer.scrollTop;
        const currentBaseStartIdx = Math.floor(scrollTop / this.rowHeight);
        this.lastRenderedStart = -1;
        this.render(currentBaseStartIdx);
    }
    
    render(baseStartIdx) {
        this.lastRenderedStart = baseStartIdx;
        const BUFFER_ROWS = 10;
        const renderStartIdx = Math.max(0, baseStartIdx - BUFFER_ROWS);
        const renderEndIdx = Math.min(this.displayedRowsData.length, baseStartIdx + this.visibleCount + BUFFER_ROWS);
        
        this.tbody.innerHTML = '';
        
        if (renderStartIdx > 0) {
            const spacerTop = document.createElement('tr');
            spacerTop.style.height = `${renderStartIdx * this.rowHeight}px`;
            spacerTop.style.pointerEvents = 'none';
            spacerTop.innerHTML = '<td colspan="5"></td>';
            this.tbody.appendChild(spacerTop);
        }
        
        for (let i = renderStartIdx; i < renderEndIdx; i++) {
            const rowData = this.displayedRowsData[i];
            const row = createTableRow(rowData, 3);
            row.dataset.rowIndex = i;
            if (i % 2 !== 0) {
                row.classList.add('even-row');
            }
            this.tbody.appendChild(row);
            this.domRowsMap.set(i, row);
        }
        
        if (renderEndIdx < this.displayedRowsData.length) {
            const remainingRows = this.displayedRowsData.length - renderEndIdx;
            const spacerBottom = document.createElement('tr');
            spacerBottom.style.height = `${remainingRows * this.rowHeight}px`;
            spacerBottom.style.pointerEvents = 'none';
            spacerBottom.innerHTML = '<td colspan="5"></td>';
            this.tbody.appendChild(spacerBottom);
        }
    }
    
    scrollToDataIndex(dataIndex) {
        const scrollTop = dataIndex * this.rowHeight;
        this.scrollContainer.scrollTop = scrollTop;
    }
    
    getRowElement(dataIndex) {
        return this.domRowsMap.get(dataIndex);
    }
}

// ==================== [ 搜尋與標籤面板管理器 ] ====================
class SearchBarManager {
    constructor({ searchInputId, tagToggleId, tagsFilterContainerId, tagButtonsId, onUpdate }) {
        this.searchInput = document.getElementById(searchInputId);
        this.tagToggle = document.getElementById(tagToggleId);
        this.tagsFilterContainer = document.getElementById(tagsFilterContainerId);
        this.tagButtons = document.getElementById(tagButtonsId);
        this.onUpdate = onUpdate;
        
        this.selectedTags = new Set();
        this.query = "";

        this.initEvents();
    }

    initEvents() {
        if (this.searchInput) {
            this.searchInput.addEventListener("input", debounce(() => {
                this.query = normalizeString(this.searchInput.value.toLowerCase());
                this.onUpdate();
            }, 800));
        }

        if (this.tagToggle && this.tagsFilterContainer) {
            this.tagToggle.addEventListener('click', () => {
                const isExpanded = this.tagToggle.getAttribute('aria-expanded') === 'true';
                this.tagToggle.setAttribute('aria-expanded', String(!isExpanded));
                this.tagsFilterContainer.classList.toggle('collapsed');
            });
        }
    }

    getQuery() {
        return this.query;
    }

    getSelectedTags() {
        return this.selectedTags;
    }

    updateTagSelection(tag) {
        if (!tag) {
            this.selectedTags.clear();
        } else {
            if (this.selectedTags.has(tag)) this.selectedTags.delete(tag);
            else this.selectedTags.add(tag);
        }
        
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
            this.onUpdate();
        });
        
        return button;
    }

    populateTagFilter(allTags) {
        if (!this.tagButtons) return;
        
        this.tagButtons.innerHTML = '';
        this.tagButtons.appendChild(this.createTagButton(''));
        
        allTags.forEach(tag => {
            this.tagButtons.appendChild(this.createTagButton(tag));
        });
    }
}

// ==================== [ 表格行建立函數 ] ====================
function getTagTranslation(tag) {
    if (window.getTL && typeof window.getTL === 'function') return window.getTL(tag) || tag;
    return tag;
}

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
    if (row.is_member_exclusive) {
        const lockIcon = document.createElement("span");
        lockIcon.classList.add("lock-icon");
        lockIcon.textContent = "🔒";
        dateCell.appendChild(lockIcon);
    }
    if (row.is_acapella) dateCell.classList.add("acapella");
    if (row.is_private) {
        const privateIcon = document.createElement("span");
        privateIcon.classList.add("private-icon");
        privateIcon.textContent = "🚫";
        dateCell.appendChild(privateIcon);
    }
    return dateCell;
}

function createTableRow(item, numDates) {
    const newRow = document.createElement("tr");
    const initialCell = newRow.insertCell();
    initialCell.textContent = item.az || item.song_name.charAt(0).toUpperCase();
    const songNameCell = newRow.insertCell();
    const songNameContainer = document.createElement("div");
    const songTitle = document.createElement("div");
    songTitle.textContent = item.song_name;
    if (item.is_copyright) songTitle.style.color = "red";
    songNameContainer.appendChild(songTitle);
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
    newRow.insertCell().textContent = item.artist;
    newRow.insertCell().textContent = item.source || "";
    const sortedDates = item.dates.sort((a, b) => {
        const dateA = new Date(`${a.date.substring(0, 4)}-${a.date.substring(4, 6)}-${a.date.substring(6, 8)}T${a.time}`);
        const dateB = new Date(`${b.date.substring(0, 4)}-${b.date.substring(4, 6)}-${b.date.substring(6, 8)}T${b.time}`);
        return dateB - dateA;
    });
    const datesContainerCell = newRow.insertCell();
    datesContainerCell.className = 'dates-container-cell';
    datesContainerCell.colSpan = numDates + 1;
    const scrollContainer = document.createElement("div");
    scrollContainer.className = "dates-container";
    const initialDates = sortedDates.slice(0, numDates);
    initialDates.forEach(dateInfo => scrollContainer.appendChild(createDateCell(dateInfo)));
    if (sortedDates.length > numDates) {
        const moreButton = document.createElement("button");
        moreButton.textContent = "...";
        moreButton.className = "more-button";
        let isExpanded = false;
        moreButton.onclick = () => {
            if (!isExpanded) {
                sortedDates.slice(numDates).forEach(dateInfo => {
                    const dateCell = createDateCell(dateInfo);
                    dateCell.classList.add("extra-date");
                    scrollContainer.appendChild(dateCell);
                });
                moreButton.textContent = "←";
                isExpanded = true;
            } else {
                scrollContainer.querySelectorAll(".extra-date").forEach(cell => cell.remove());
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

// ==================== [ 排序與過濾邏輯 ] ====================
function sortData(data, sortConfig = {}) {
    const { column = 'song_name', reverse = false } = sortConfig;
    return [...data].sort((a, b) => {
        let aVal, bVal;
        if (column === 'az') {
            aVal = getJapaneseSortKey(a);
            bVal = getJapaneseSortKey(b);
        } else if (column === 'dates') {
            aVal = a.dates && a.dates.length > 0 ? a.dates[0].date : '0';
            bVal = b.dates && b.dates.length > 0 ? b.dates[0].date : '0';
        } else {
            // 【執行邏輯優化】排序點擊時，歌手與來源直接取用預處理文字
            if (column === 'artist') {
                aVal = a._normArtist;
                bVal = b._normArtist;
            } else if (column === 'source') {
                aVal = a._normSource;
                bVal = b._normSource;
            } else {
                aVal = a[column] || '';
                bVal = b[column] || '';
                if (typeof aVal === 'string') {
                    aVal = normalizeString(aVal);
                    bVal = normalizeString(bVal);
                }
            }
        }
        if (aVal > bVal) return reverse ? -1 : 1;
        if (aVal < bVal) return reverse ? 1 : -1;
        return 0;
    });
}

function sortTagsForDisplay(a, b) {
    const tagOrder = ['Showa', '90s', '00s', '10s', '20s', 'Female', 'Male', 'Anime', 'Game'];
    const getPriority = (tag) => {
        const index = tagOrder.indexOf(tag);
        return index !== -1 ? index : 999;
    };
    const pa = getPriority(a);
    const pb = getPriority(b);
    return pa !== pb ? pa - pb : a.localeCompare(b, 'en');
}

// ==================== [ 主程式業務邏輯 ] ====================
document.addEventListener("DOMContentLoaded", function () {
    const scrollContainer = document.getElementById("virtualScrollContainer");
    const songTable = document.getElementById("songTable");
    const songTableBody = songTable.getElementsByTagName("tbody")[0];
    
    let allData = [];
    let totalSongCount = 0;
    let currentSortConfig = { column: 'song_name', reverse: false };
    let virtualScroller = null;
    let searchBar = null;

    function initVirtualScroller() {
        if (!virtualScroller) {
            virtualScroller = new VirtualScrollManager(scrollContainer, songTableBody, 62);
        }
    }
    
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
    
    function setupTableHeaderSort() {
        songTable.querySelectorAll('th').forEach(header => {
            header.addEventListener('click', () => {
                const column = getColumnFromHeader(header);
                if (currentSortConfig.column === column) {
                    currentSortConfig.reverse = !currentSortConfig.reverse;
                } else {
                    currentSortConfig.column = column;
                    currentSortConfig.reverse = false;
                }
                applyFilters();
            });
        });
    }

    // 核心資料過濾、分組與排序管線
    function applyFilters() {
        if (!searchBar) return;

        const query = searchBar.getQuery();
        const selectedTags = searchBar.getSelectedTags();
        
        // 【執行邏輯優化】過濾階段：直接比對記憶體中已處理好的欄位
        const filteredData = allData.filter((row) => {
            let searchMatch = true;
            let tagMatch = true;
            
            if (selectedTags.size > 0) {
                // 改用快速中斷的迴圈，比 .every() 效能更佳
                for (const t of selectedTags) {
                    if (!row.tags.includes(t)) {
                        tagMatch = false;
                        break;
                    }
                }
            }
            
            if (isValidDateFormat(query)) {
                const formattedQuery = `${query.substring(4, 8)}${query.substring(2, 4)}${query.substring(0, 2)}`;
                searchMatch = row.dates.some(date => date.date === formattedQuery);
            } else if (query) {
                // 直接讀取帶有底線的預存純文字，不再重複呼叫繁重的 normalizeString()
                searchMatch = row._normName.includes(query) ||
                            row._normArtist.includes(query) ||
                            row._normSource.includes(query);
            }
            return searchMatch && tagMatch;
        });
        
        // 【執行邏輯優化】分組階段：直接使用預先產生的 _groupKey
        const groupedData = filteredData.reduce((acc, row) => {
            const key = row._groupKey;
            if (!acc[key]) acc[key] = { ...row, dates: [] };
            acc[key].dates.push(...row.dates);
            return acc;
        }, {});
        
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
            }
            return a.song_name.localeCompare(b.song_name, 'ja-JP');
        });
        
        if (currentSortConfig.column !== 'song_name') {
            sortedData = sortData(sortedData, currentSortConfig);
        }
        
        window.allDisplayedData = sortedData;
        virtualScroller.setDisplayData(sortedData);
    }
    
    // 初始化搜尋與標籤管理
    searchBar = new SearchBarManager({
        searchInputId: "searchInput",
        tagToggleId: "tagToggle",
        tagsFilterContainerId: "tagsFilterContainer",
        tagButtonsId: "tagButtons",
        onUpdate: applyFilters
    });

    async function fetchData() {
        try {
            // 完全保留 no-cache，確保每次重新整理都向伺服器獲取最新資料
            const response = await fetch("data.json", { cache: "no-cache" });
            const data = await response.json();
            
            // 【執行邏輯優化】在純記憶體(RAM)中進行一次性轉換，完全不佔用本機硬碟空間
            allData = data.map(song => {
                const tags = Array.isArray(song.tags) ? song.tags : [];
                const normName = normalizeString(song.song_name || "");
                const normArtist = normalizeString(song.artist || "");
                const normSource = normalizeString(song.source || "");
                return {
                    ...song,
                    tags: tags,
                    _normName: normName,
                    _normArtist: normArtist,
                    _normSource: normSource,
                    _groupKey: `${normName}-${normArtist}` // 預先綁定分組 Key，避免重複拼接
                };
            });
            
            // 【執行邏輯優化】利用高效能的 Set 結構，瞬間計算出不重複的歌數，不再繞路計算
            const uniqueKeys = new Set(allData.map(song => song._groupKey));
            totalSongCount = uniqueKeys.size;
            
            initVirtualScroller();
            applyFilters();
            
            const songCountElement = document.getElementById("songCount");
            if (songCountElement) songCountElement.textContent = totalSongCount;
            
            const allTags = [...new Set(data.flatMap(song => song.tags || []))];
            allTags.sort(sortTagsForDisplay);
            searchBar.populateTagFilter(allTags);
            
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }
    
    // 隨機抽選按鈕
    const randomButton = document.getElementById('randomButton');
    if (randomButton) {
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
                    setTimeout(() => row.classList.remove('blink-animation'), 3800);
                }
            }, 800);
        });
    }
    
    // 多國語系切換邏輯
    const originalOnLanguageChange = window.onLanguageChange;
    window.onLanguageChange = function(newLang) {
        if (originalOnLanguageChange) originalOnLanguageChange(newLang);
        document.querySelectorAll('.song-tag').forEach(tagSpan => {
            const originalTag = tagSpan.dataset.originalTag;
            if (originalTag) tagSpan.textContent = getTagTranslation(originalTag);
        });
        document.querySelectorAll('#tagButtons .tag-button').forEach(button => {
            const tag = button.dataset.tag;
            button.textContent = tag ? window.getTL(tag) || tag : window.getTL('allTags') || '全部';
        });
    };
    
    setupTableHeaderSort();
    fetchData();
});
