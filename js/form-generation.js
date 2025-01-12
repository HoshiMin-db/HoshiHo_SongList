// form-generation.js

// 防抖函數，用於限制函數的觸發頻率
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 引用 youtube-player.js 中的功能
document.addEventListener("DOMContentLoaded", function() {
    window.closeFloatingPlayer = closeFloatingPlayer;
    window.openFloatingPlayer = openFloatingPlayer;
});

// 字符串規範化函數，用於處理不同的字符串格式
import { convert_jp } from './romaji.js';

// 增加輸入驗證和清理函數
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    // 移除可能的XSS攻擊字符
    return input.replace(/[<>&'"]/g, '')
               // 移除 HTML 標籤
               .replace(/<[^>]*>/g, '')
               // 移除特殊字符
               .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
}

// 改善 normalizeString 函數
function normalizeString(str) {
    if (!str) return '';
    
    // 先進行安全性清理
    str = sanitizeInput(str);
    
    // 再進行原有的轉換
    str = convert_jp(str);
    
    return str.normalize('NFKC')
             .replace(/[~\u301c\uff5e]/g, '~')
             .replace(/，/g, ',')
             .replace(/。/g, '.')
             .replace(/['']/g, "'")
             .replace(/…/g, '...')
             .replace(/\s+/g, '')
             .toLowerCase();
}

// 虛擬滾動管理器
class VirtualScroller {
    constructor(container, data, renderRow) {
        this.container = container;
        this.data = data;
        this.renderRow = renderRow;
        this.scrollContainer = document.createElement('div');
        this.contentContainer = document.createElement('div');
        this.setupContainer();
        this.currentOffset = 0;
        this.setupEvents();
        this.render();
    }

    setupContainer() {
        // 設置外層容器
        this.container.style.height = `${ROW_HEIGHT * VISIBLE_ROWS}px`;
        this.container.style.overflow = 'auto';
        this.container.style.position = 'relative';

        // 設置滾動容器
        this.scrollContainer.style.height = `${this.data.length * ROW_HEIGHT}px`;
        this.scrollContainer.style.position = 'relative';

        // 設置內容容器
        this.contentContainer.style.position = 'absolute';
        this.contentContainer.style.top = '0';
        this.contentContainer.style.left = '0';
        this.contentContainer.style.width = '100%';

        this.scrollContainer.appendChild(this.contentContainer);
        this.container.appendChild(this.scrollContainer);
    }

    setupEvents() {
        this.container.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    }

    handleScroll() {
        const scrollTop = this.container.scrollTop;
        const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
        this.render(startIndex);
    }

    render(startIndex = 0) {
        // 計算需要渲染的範圍
        const start = Math.max(0, startIndex - BUFFER_SIZE);
        const end = Math.min(this.data.length, startIndex + VISIBLE_ROWS + BUFFER_SIZE);
        
        // 更新內容容器位置
        this.contentContainer.style.transform = `translateY(${start * ROW_HEIGHT}px)`;

        // 清空並重新渲染內容
        this.contentContainer.innerHTML = '';
        for (let i = start; i < end; i++) {
            const row = this.renderRow(this.data[i], i);
            row.style.height = `${ROW_HEIGHT}px`;
            this.contentContainer.appendChild(row);
        }
    }
}

// 修改主要的顯示函數
function displayData(data, numDates = 3) {
    // 先進行資料分組
    const groupedData = data.reduce((acc, row) => {
        const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
        if (!acc[key]) {
            acc[key] = {
                ...row,
                dates: []
            };
        }
        acc[key].dates = [
            ...acc[key].dates,
            ...row.dates
        ].sort((a, b) => {
            const dateA = new Date(a.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + 'T' + a.time);
            const dateB = new Date(b.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + 'T' + b.time);
            return dateB - dateA;
        });
        return acc;
    }, {});

    const processedData = Object.values(groupedData);

    // 建立虛擬滾動器
    new VirtualScroller(
        songTableBody.parentElement, // 表格容器
        processedData,
        (item, index) => createTableRow(item, index, numDates)
    );
}

// 創建表格行的函數
function createTableRow(item, index, numDates) {
    const row = document.createElement('tr');
    
    // 添加初始欄位
    const initialCell = document.createElement('td');
    initialCell.textContent = item.song_name.charAt(0).toUpperCase();
    row.appendChild(initialCell);

    // 歌名欄位
    const songNameCell = document.createElement('td');
    songNameCell.textContent = item.song_name;
    if (item.is_copyright) {
        songNameCell.style.color = 'red';
    }
    row.appendChild(songNameCell);

    // 藝術家欄位
    const artistCell = document.createElement('td');
    artistCell.textContent = item.artist;
    row.appendChild(artistCell);

    // 來源欄位
    const sourceCell = document.createElement('td');
    sourceCell.textContent = item.source || '';
    row.appendChild(sourceCell);

    // 添加日期欄位
    const dateCount = Math.min(numDates, item.dates.length);
    for (let i = 0; i < dateCount; i++) {
        const dateCell = document.createElement('td');
        const dateData = item.dates[i];
        const link = document.createElement('a');
        const date = dateData.date;
        const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
        
        link.href = dateData.link;
        link.textContent = formattedDate;
        link.onclick = (e) => {
            e.preventDefault();
            openFloatingPlayer(link.href);
        };
        
        dateCell.appendChild(link);

        if (dateData.is_member_exclusive) {
            const lockIcon = document.createElement('span');
            lockIcon.classList.add('lock-icon');
            lockIcon.textContent = '🔒';
            dateCell.appendChild(lockIcon);
        }

        if (dateData.is_acapella) {
            dateCell.classList.add('acapella');
        }

        row.appendChild(dateCell);
    }

    // 補充空白欄位
    for (let i = dateCount; i < numDates; i++) {
        row.appendChild(document.createElement('td'));
    }

    // 添加更多按鈕
    const moreCell = document.createElement('td');
    if (item.dates.length > numDates) {
        const moreButton = document.createElement('button');
        moreButton.textContent = '...';
        moreButton.className = 'more-button';
        moreButton.onclick = () => handleMoreDates(row, item, numDates);
        moreCell.appendChild(moreButton);
    }
    row.appendChild(moreCell);

    return row;
}

// 處理更多日期的函數
function handleMoreDates(row, item, numDates) {
    const moreButton = row.querySelector('.more-button');
    const isExpanded = moreButton.getAttribute('data-expanded') === 'true';
    
    if (isExpanded) {
        // 收起額外的日期
        const extraDates = row.querySelectorAll('.extra-date');
        extraDates.forEach(cell => cell.remove());
        moreButton.setAttribute('data-expanded', 'false');
    } else {
        // 展開額外的日期
        item.dates.slice(numDates).forEach(dateData => {
            const dateCell = document.createElement('td');
            dateCell.classList.add('date-cell', 'extra-date');
            
            const link = document.createElement('a');
            const date = dateData.date;
            const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
            
            link.href = dateData.link;
            link.textContent = formattedDate;
            link.onclick = (e) => {
                e.preventDefault();
                openFloatingPlayer(link.href);
            };
            
                        dateCell.appendChild(link);

            if (dateData.is_member_exclusive) {
                const lockIcon = document.createElement('span');
                lockIcon.classList.add('lock-icon');
                lockIcon.textContent = '🔒';
                dateCell.appendChild(lockIcon);
            }

            if (dateData.is_acapella) {
                dateCell.classList.add('acapella');
            }

            row.insertBefore(dateCell, row.lastElementChild);
        });
        moreButton.setAttribute('data-expanded', 'true');
    }
}

// 初始化數據
document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    const songTableHead = document.getElementById('songTable').getElementsByTagName('thead')[0];
    let totalSongCount = 0; 

    function fetchData(callback) {
        fetch('data.json', { cache: 'no-cache' })
            .then(response => response.json())
            .then(data => {
                if (totalSongCount === 0) {
                    const uniqueSongs = new Set(data.map(item => `${normalizeString(item.song_name)}-${normalizeString(item.artist)}`));
                    totalSongCount = uniqueSongs.size;
                    document.getElementById('songCount').textContent = totalSongCount;
                }
                callback(data);
            })
            .catch(error => console.error('Error fetching data:', error));
    }

    function fetchAndDisplayData(query, allData) {
        songTableBody.innerHTML = '';
        const filteredData = allData.filter(row =>
            normalizeString(row.song_name).includes(query) ||
            normalizeString(row.artist).includes(query) ||
            normalizeString(row.source).includes(query)
        );
        displayData(filteredData);
    }

    // 使用防抖函數來處理搜尋輸入事件
    searchInput.addEventListener('input', debounce(function(e) { 
        const query = normalizeString(e.target.value.toLowerCase());
        fetchData(data => fetchAndDisplayData(query, data));
    }, 500)); // 設置防抖延遲時間為500毫秒

    fetchData(data => fetchAndDisplayData('', data));
});
