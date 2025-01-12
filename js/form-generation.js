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

// 添加虛擬滾動相關的常數
const ROW_HEIGHT = 40; // 每行的高度（像素）
const VISIBLE_ROWS = 20; // 可見行數
const BUFFER_SIZE = 5; // 緩衝區大小（上下各多少行）

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

// 修改 displayData 函數，接收 songTableBody 作為參數
function displayData(data, songTableBody, numDates = 3) {
    // 資料分組邏輯保持不變
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
        songTableBody.parentElement,
        processedData,
        (item, index) => createTableRow(item, index, numDates)
    );
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
        // 將 songTableBody 作為參數傳遞給 displayData
        displayData(filteredData, songTableBody);
    }

    // 使用防抖函數來處理搜尋輸入事件
    searchInput.addEventListener('input', debounce(function(e) {
        const query = normalizeString(e.target.value.toLowerCase());
        fetchData(data => fetchAndDisplayData(query, data));
    }, 500));

    // 初始載入數據
    fetchData(data => fetchAndDisplayData('', data));
});
