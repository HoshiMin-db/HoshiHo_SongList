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

    // 使用正則表達式反覆替換直到所有不安全字符被移除
    let sanitizedInput = input;
    const unsafePatterns = /[<>&'"]|<[^>]*>|[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g;

    while (unsafePatterns.test(sanitizedInput)) {
        sanitizedInput = sanitizedInput.replace(unsafePatterns, '');
    }

    return sanitizedInput;
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

// 創建表格行
function createTableRow(item, numDates) {
    const newRow = document.createElement('tr');

    const initialCell = newRow.insertCell();
    initialCell.textContent = item.az || item.song_name.charAt(0).toUpperCase();

    const songNameCell = newRow.insertCell();
    songNameCell.textContent = item.song_name;

    // 檢查是否為版權標記歌曲
    if (item.is_copyright) {
        songNameCell.style.color = 'red';
    }

    newRow.insertCell().textContent = item.artist;
    newRow.insertCell().textContent = item.source || '';

    // 生成日期欄位
    const dateCount = Math.min(numDates, item.dates.length);

    // 先生成所有需要的日期欄位
    for (let i = 0; i < dateCount; i++) {
        const dateCell = newRow.insertCell();
        const row = item.dates[i];
        const link = document.createElement('a');
        const date = row.date;
        const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
        link.href = row.link;
        link.textContent = formattedDate;
        link.target = '_blank';
        link.onclick = function(event) {
            event.preventDefault();
            if (isValidYouTubeURL(link.href)) {
                openFloatingPlayer(link.href);
            } else {
                console.error('Invalid URL:', link.href);
            }
        };
        dateCell.appendChild(link);

        if (row.is_member_exclusive) {
            const lockIcon = document.createElement('span');
            lockIcon.classList.add('lock-icon');
            lockIcon.textContent = '🔒';
            dateCell.appendChild(lockIcon);
        }
        if (row.is_acapella) {
            dateCell.classList.add('acapella');
        }
    }

    // 補充空白儲存格
    for (let i = dateCount; i < numDates; i++) {
        newRow.insertCell();
    }

    // 添加更多按鈕或空白儲存格
    if (item.dates.length > numDates) {
        const moreButtonCell = newRow.insertCell();
        const moreButton = document.createElement('button');
        moreButton.textContent = '...';
        moreButton.className = 'more-button';
        moreButton.onclick = () => {
            const isExpanded = moreButton.getAttribute('data-expanded') === 'true';

            if (isExpanded) {
                const toRemove = newRow.querySelectorAll('.extra-date');
                toRemove.forEach(el => el.remove());
                moreButton.setAttribute('data-expanded', 'false');
            } else {
                item.dates.slice(numDates).forEach(row => {
                    const dateCell = newRow.insertCell();
                    dateCell.classList.add('date-cell', 'extra-date');

                    const link = document.createElement('a');
                    const date = row.date;
                    const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
                    link.href = row.link;
                    link.textContent = formattedDate;
                    link.target = '_blank';
                    link.onclick = function(event) {
                        event.preventDefault();
                        if (isValidYouTubeURL(link.href)) {
                            openFloatingPlayer(link.href);
                        } else {
                            console.error('Invalid URL:', link.href);
                        }
                    };
                    dateCell.appendChild(link);

                    if (row.is_member_exclusive) {
                        const lockIcon = document.createElement('span');
                        lockIcon.classList.add('lock-icon');
                        lockIcon.textContent = '🔒';
                        dateCell.appendChild(lockIcon);
                    }
                    if (row.is_acapella) {
                        dateCell.classList.add('acapella');
                    }
                });
                moreButton.setAttribute('data-expanded', 'true');
            }
        };
        moreButtonCell.appendChild(moreButton);
    } else {
        newRow.insertCell();
    }

    return newRow;
}

// 檢查 URL 是否為有效的 YouTube 網域
function isValidYouTubeURL(url) {
    try {
        const parsedURL = new URL(url);
        // 允許的 YouTube 網域清單
        const allowedDomains = ['www.youtube.com', 'youtu.be'];
        return allowedDomains.includes(parsedURL.hostname);
    } catch (e) {
        return false;
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    const songCountElement = document.getElementById('songCount');
    let allData = [];

// 新增一個函數來判斷字符類型
function getCharacterType(text) {
    if (!text) return 'other';
    
    // 移除開頭空白並取第一個字符
    const firstChar = text.trim().charAt(0);
    if (!firstChar) return 'other';
    
    // 判斷符號 (包含特殊符號如〜、→、∞等)
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?～！＠＃＄％＾＆＊（）＿＋－＝［］｛｝；＇："＼｜，．＜＞／？〜∞→←↑↓]/.test(firstChar)) {
        return 'symbol';
    }
    
    // 判斷英文
    if (/[a-zA-Z]/.test(firstChar)) {
        return 'english';
    }
    
    // 判斷數字
    if (/[0-9０-９]/.test(firstChar)) {
        return 'number';
    }
    
    // 假設其他都是日文（包含假名和漢字）
    return 'japanese';
}

// 獲取排序權重
function getSortWeight(type) {
    const weights = {
        'symbol': 0,
        'number': 1,
        'english': 2,
        'japanese': 3,
        'other': 4
    };
    return weights[type] ?? weights.other;
}

// 修改 fetchData 函數中的排序邏輯
async function fetchData() {
    try {
        const response = await fetch('data.json', { cache: 'no-cache' });
        const data = await response.json();
        
        // 修改排序邏輯
        allData = data.sort((a, b) => {
            const aName = a.song_name;
            const bName = b.song_name;
            
            // 先取得字符類型
            const aType = getCharacterType(aName);
            const bType = getCharacterType(bName);
            
            // 比較類型權重
            const weightDiff = getSortWeight(aType) - getSortWeight(bType);
            if (weightDiff !== 0) {
                return weightDiff;
            }
            
            // 如果類型相同，再按具體規則排序
            if (aType === 'japanese' && bType === 'japanese') {
                // 如果有 az 分類，優先使用
                if (a.az && b.az) {
                    const azCompare = a.az.localeCompare(b.az, 'ja-JP');
                    if (azCompare !== 0) {
                        return azCompare;
                    }
                }
            }
            
            // 最後按原始名稱排序
            return aName.localeCompare(bName, 'ja-JP');
        });
        
        displayData(allData);
        if (songCountElement) {
            songCountElement.textContent = allData.length;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// 修改 displayData 函數中的排序邏輯
function displayData(data, numDates = 3) {
    const groupedData = data.reduce((acc, row) => {
        const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
        if (!acc[key]) {
            acc[key] = { ...row, dates: [] };
        }
        const allDates = [...acc[key].dates, ...row.dates];
        acc[key].dates = allDates.sort((a, b) => {
            const dateA = new Date(a.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + 'T' + a.time);
            const dateB = new Date(b.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + 'T' + b.time);
            return dateB - dateA;
        });
        return acc;
    }, {});

    songTableBody.innerHTML = '';
    
    // 將分組後的數據轉換為數組並排序
    const sortedData = Object.values(groupedData).sort((a, b) => {
        const aName = a.song_name;
        const bName = b.song_name;
        
        const aType = getCharacterType(aName);
        const bType = getCharacterType(bName);
        
        const weightDiff = getSortWeight(aType) - getSortWeight(bType);
        if (weightDiff !== 0) {
            return weightDiff;
        }
        
        if (aType === 'japanese' && bType === 'japanese') {
            if (a.az && b.az) {
                const azCompare = a.az.localeCompare(b.az, 'ja-JP');
                if (azCompare !== 0) {
                    return azCompare;
                }
            }
        }
        
        return aName.localeCompare(bName, 'ja-JP');
    });

    sortedData.forEach(item => {
        const newRow = createTableRow(item, numDates);
        songTableBody.appendChild(newRow);
    });
}

// 修改 sortTable 函數
function sortTable() {
    const table = document.getElementById('songTable');
    const rows = Array.from(table.getElementsByTagName('tbody')[0].rows);
    
    rows.sort((a, b) => {
        const aText = a.cells[1].textContent;
        const bText = b.cells[1].textContent;
        
        const aType = getCharacterType(aText);
        const bType = getCharacterType(bText);
        
        const weightDiff = getSortWeight(aType) - getSortWeight(bType);
        if (weightDiff !== 0) {
            return weightDiff;
        }
        
        if (aType === 'japanese' && bType === 'japanese') {
            const aFirstChar = a.cells[0].textContent;
            const bFirstChar = b.cells[0].textContent;
            const firstCharCompare = aFirstChar.localeCompare(bFirstChar, 'ja-JP');
            if (firstCharCompare !== 0) {
                return firstCharCompare;
            }
        }
        
        return aText.localeCompare(bText, 'ja-JP');
    });
    
    rows.forEach(row => table.getElementsByTagName('tbody')[0].appendChild(row));
}

    // 確認元素是否存在
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            const query = normalizeString(e.target.value.toLowerCase());
            const filteredData = allData.filter(row =>
                normalizeString(row.song_name).includes(query) ||
                normalizeString(row.artist).includes(query) ||
                normalizeString(row.source).includes(query)
            );
            displayData(filteredData);
        }, 800));
    } else {
        console.error("searchInput element not found");
    }

    // 頁面加載時顯示全部表單
    fetchData();
});
