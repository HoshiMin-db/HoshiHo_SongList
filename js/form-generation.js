// ============ 修復版 form-generation.js ============

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

// 引用 youtube-player.js
document.addEventListener("DOMContentLoaded", function () {
    window.closeFloatingPlayer = closeFloatingPlayer;
    window.openFloatingPlayer = openFloatingPlayer;
});

// 字符串規範化
import { convert_jp } from "./romaji.js";

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

// ============ 修復版虛擬滾動管理器 ============
class VirtualScrollManager {
    constructor(scrollContainer, tbody, rowHeight = 62) {
        this.scrollContainer = scrollContainer;
        this.tbody = tbody;
        this.rowHeight = rowHeight;
        this.displayedRowsData = [];
        this.visibleCount = Math.ceil(scrollContainer.clientHeight / rowHeight) + 5;
        this.lastRenderedStart = -1;
        this.domRowsMap = new Map();  // ← 快取行映射
        
        this.scrollContainer.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        window.addEventListener('resize', () => this.recalculateVisible());
    }
    
    setDisplayData(rowsData) {
        this.displayedRowsData = rowsData;
        this.domRowsMap.clear();
        
        // 設置虛擬高度（用於滾動條）
        this.tbody.style.minHeight = `${rowsData.length * this.rowHeight}px`;
        
        // 重置滾動位置
        this.scrollContainer.scrollTop = 0;
        
        // 初始渲染
        this.render(0);
    }
    
    handleScroll() {
        const scrollTop = this.scrollContainer.scrollTop;
        const startIdx = Math.floor(scrollTop / this.rowHeight);
        
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
    
    render(startIdx) {
        this.lastRenderedStart = startIdx;
        const endIdx = Math.min(startIdx + this.visibleCount, this.displayedRowsData.length);
        
        // ✅ 關鍵修改：清空 tbody 但保留結構
        this.tbody.innerHTML = '';
        
        // 創建虛擬占位符（頂部）
        if (startIdx > 0) {
            const spacerTop = document.createElement('tr');
            spacerTop.style.height = `${startIdx * this.rowHeight}px`;
            spacerTop.style.pointerEvents = 'none';
            spacerTop.innerHTML = '<td colspan="5"></td>';
            this.tbody.appendChild(spacerTop);
        }
        
        // 只為可見行建立 DOM
        for (let i = startIdx; i < endIdx; i++) {
            const rowData = this.displayedRowsData[i];
            const row = createTableRow(rowData, 3);
            row.dataset.rowIndex = i;
            
            // 根據真實的資料陣列索引來上色
            if (i % 2 !== 0) {
                row.classList.add('even-row');
            }
            
            this.tbody.appendChild(row);
            this.domRowsMap.set(i, row);
        }
        
        // 創建虛擬占位符（底部）
        if (endIdx < this.displayedRowsData.length) {
            const remainingRows = this.displayedRowsData.length - endIdx;
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
    
    if (row.is_acapella) {
        dateCell.classList.add("acapella");
    }
    
    if (row.is_private) {
        const privateIcon = document.createElement("span");
        privateIcon.classList.add("private-icon");
        privateIcon.textContent = "🚫";
        dateCell.appendChild(privateIcon);
    }
    
    return dateCell;
}

function getTagTranslation(tag) {
    if (window.getTL && typeof window.getTL === 'function') {
        return window.getTL(tag) || tag;
    }
    return tag;
}

function createTableRow(item, numDates) {
    const newRow = document.createElement("tr");
    
    const initialCell = newRow.insertCell();
    initialCell.textContent = item.az || item.song_name.charAt(0).toUpperCase();
    
    const songNameCell = newRow.insertCell();
    const songNameContainer = document.createElement("div");
    
    const songTitle = document.createElement("div");
    songTitle.textContent = item.song_name;
    if (item.is_copyright) {
        songTitle.style.color = "red";
    }
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
    
    const initialDates = sortedDates.slice(0, numDates);
    initialDates.forEach(dateInfo => {
        const dateCell = createDateCell(dateInfo);
        scrollContainer.appendChild(dateCell);
    });
    
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

function sortData(data, sortConfig = {}) {
    const { column = 'song_name', reverse = false } = sortConfig;
    
    const sorted = [...data].sort((a, b) => {
        let aVal, bVal;
        
        if (column === 'az') {
            aVal = getJapaneseSortKey(a);
            bVal = getJapaneseSortKey(b);
        } else if (column === 'dates') {
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
    
    let allData = [];
    let totalSongCount = 0;
    let selectedTags = new Set();
    let currentSortConfig = { column: 'song_name', reverse: false };
    let virtualScroller = null;
    
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
        const headers = songTable.querySelectorAll('th');
        
        headers.forEach(header => {
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
    
    function updateTagSelection(tag) {
        if (!tag) {
            selectedTags.clear();
        } else {
            if (selectedTags.has(tag)) selectedTags.delete(tag);
            else selectedTags.add(tag);
        }
        
        document.querySelectorAll('#tagButtons .tag-button').forEach(button => {
            const t = button.dataset.tag;
            if (!t) {
                button.classList.toggle('selected', selectedTags.size === 0);
            } else {
                button.classList.toggle('selected', selectedTags.has(t));
            }
        });
    }
    
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
    
    function populateTagFilter(allTags) {
        const tagButtons = document.getElementById('tagButtons');
        if (!tagButtons) return;
        
        tagButtons.innerHTML = '';
        tagButtons.appendChild(createTagButton(''));
        
        allTags.forEach(tag => {
            tagButtons.appendChild(createTagButton(tag));
        });
    }
    
    function applyFilters() {
        const query = normalizeString(searchInput.value.toLowerCase());
        
        const filteredData = allData.filter((row) => {
            let searchMatch = true;
            let tagMatch = true;
            
            if (selectedTags.size > 0) {
                tagMatch = Array.isArray(row.tags) && 
                          Array.from(selectedTags).every(t => row.tags.includes(t));
            }
            
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
        
        const groupedData = filteredData.reduce((acc, row) => {
            const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
            if (!acc[key]) {
                acc[key] = { ...row, dates: [] };
            }
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
                return a.song_name.localeCompare(b.song_name, 'ja-JP');
            }
            
            return a.song_name.localeCompare(b.song_name, 'ja-JP');
        });
        
        if (currentSortConfig.column !== 'song_name') {
            sortedData = sortData(sortedData, currentSortConfig);
        }
        
        window.allDisplayedData = sortedData;
        virtualScroller.setDisplayData(sortedData);
    }
    
    async function fetchData() {
        try {
            const response = await fetch("data.json", { cache: "no-cache" });
            const data = await response.json();
            
            data.forEach(song => {
                if (!song.tags || !Array.isArray(song.tags)) {
                    song.tags = [];
                }
            });
            
            allData = data;
            
            totalSongCount = Object.keys(
                data.reduce((acc, row) => {
                    const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
                    acc[key] = true;
                    return acc;
                }, {})
            ).length;
            
            initVirtualScroller();
            applyFilters();
            
            const songCountElement = document.getElementById("songCount");
            if (songCountElement) {
                songCountElement.textContent = totalSongCount;
            }
            
            const allTags = [...new Set(
                data.flatMap(song => song.tags || [])
            )];
            allTags.sort(sortTagsForDisplay);
            populateTagFilter(allTags);
            
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }
    
    if (searchInput) {
        searchInput.addEventListener("input", debounce(applyFilters, 800));
    }
    
    const tagToggle = document.getElementById('tagToggle');
    const tagsFilterContainer = document.getElementById('tagsFilterContainer');
    if (tagToggle && tagsFilterContainer) {
        tagToggle.addEventListener('click', () => {
            const isExpanded = tagToggle.getAttribute('aria-expanded') === 'true';
            tagToggle.setAttribute('aria-expanded', String(!isExpanded));
            tagsFilterContainer.classList.toggle('collapsed');
        });
    }
    
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
                    setTimeout(() => {
                        row.classList.remove('blink-animation');
                    }, 3800);
                }
            }, 800);
        });
    }
    
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
    
    setupTableHeaderSort();
    fetchData();
});
