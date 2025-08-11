// form-generation.js

// 防抖函數，用於限制函數的觸發頻率
function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this,
            args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 引用 youtube-player.js 中的功能
document.addEventListener("DOMContentLoaded", function () {
    window.closeFloatingPlayer = closeFloatingPlayer;
    window.openFloatingPlayer = openFloatingPlayer;
});

// 字符串規範化函數，用於處理不同的字符串格式
import { convert_jp } from "./romaji.js";

// 增加輸入驗證和清理函數
function sanitizeInput(input) {
    if (typeof input !== "string") return "";

    let sanitizedInput = input;
    const unsafePatterns =
        /[<>&'"]|<[^>]*>|[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g;

    while (unsafePatterns.test(sanitizedInput)) {
        sanitizedInput = sanitizedInput.replace(unsafePatterns, "");
    }

    return sanitizedInput;
}

// 改善 normalizeString 函數
function normalizeString(str) {
    if (!str) return "";

    str = sanitizeInput(str);
    str = convert_jp(str);
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

// 檢查是否為有效的 DDMMYYYY 日期格式
function isValidDateFormat(dateStr) {
    const regex = /^\d{2}\d{2}\d{4}$/; // 檢查 DDMMYYYY 格式
    if (!regex.test(dateStr)) return false;

    const day = parseInt(dateStr.substring(0, 2), 10);
    const month = parseInt(dateStr.substring(2, 4), 10);
    const year = parseInt(dateStr.substring(4, 8), 10);

    const date = new Date(year, month - 1, day);
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

// 判斷字符類型
function getCharacterType(text) {
    if (!text) return "other";

    const firstChar = text.trim().charAt(0);
    if (!firstChar) return "other";

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?～！＠＃＄％＾＆＊（）＿＋－＝［］｛｝；＇："＼｜，．＜＞／？〜∞→←↑↓]/.test(firstChar)) {
        return "symbol";
    }

    if (/[a-zA-Z]/.test(firstChar)) {
        return "english";
    }

    if (/[0-9０-９]/.test(firstChar)) {
        return "number";
    }

    return "japanese";
}

// 獲取日文歌曲的排序用假名
function getJapaneseSortKey(item) {
    if (item.az) {
        return item.az;
    }
    return item.song_name.charAt(0);
}

// 獲取排序權重
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

// 創建日期儲存格
function createDateCell(row, newRow) {
    const dateCell = newRow.insertCell();
    const link = document.createElement("a");
    const date = row.date;
    const formattedDate = `${date.substring(6, 8)}/${date.substring(
        4,
        6
    )}/${date.substring(0, 4)}`;
    link.href = row.link;
    link.textContent = formattedDate;
    link.target = "_blank";

    link.onclick = function (event) {
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

// 創建表格行
function createTableRow(item, numDates) {
    const newRow = document.createElement("tr");

    const initialCell = newRow.insertCell();
    initialCell.textContent = item.az || item.song_name.charAt(0).toUpperCase();

    const songNameCell = newRow.insertCell();
    songNameCell.textContent = item.song_name;

    if (item.is_copyright) {
        songNameCell.style.color = "red";
    }

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

    // 創建一個容器來存放所有日期儲存格
    const datesContainer = document.createElement("td");
    datesContainer.colSpan = numDates + 1; // +1 為了包含更多按鈕
    
    // 創建可滾動的日期容器
    const scrollContainer = document.createElement("div");
    scrollContainer.className = "dates-container";
    
    // 只展示最近的 numDates 個日期（預設為3個）
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
                // 添加剩餘的日期（從第numDates個開始）
                sortedDates.slice(numDates).forEach(dateInfo => {
                    const dateCell = createDateCell(dateInfo);
                    dateCell.classList.add("date-cell", "extra-date");
                    scrollContainer.appendChild(dateCell);
                });
                moreButton.textContent = "←";
                isExpanded = true;
            } else {
                // 只保留最初的numDates個日期
                const extraDates = scrollContainer.querySelectorAll(".extra-date");
                extraDates.forEach(cell => cell.remove());
                moreButton.textContent = "...";
                isExpanded = false;
            }
        };

        // 將按鈕添加到容器中
        const buttonCell = document.createElement("div");
        buttonCell.className = "date-cell";
        buttonCell.appendChild(moreButton);
        scrollContainer.appendChild(buttonCell);
    }

    datesContainer.appendChild(scrollContainer);
    newRow.appendChild(datesContainer);

    return newRow;
}

// 顯示數據並排序
function displayData(data, numDates = 3) {
    const songTableBody = document
        .getElementById("songTable")
        .getElementsByTagName("tbody")[0];

    songTableBody.innerHTML = "";

    const groupedData = data.reduce((acc, row) => {
        const key = `${normalizeString(row.song_name)}-${normalizeString(
            row.artist
        )}`;
        if (!acc[key]) {
            acc[key] = { ...row, dates: [] };
        }
        acc[key].dates.push(...row.dates);
        return acc;
    }, {});

    // 在 displayData 函數中，修改這部分代碼
    Object.values(groupedData)
        .sort((a, b) => {
            const aType = getCharacterType(a.song_name);
            const bType = getCharacterType(b.song_name);
    
            const weightDiff = getSortWeight(aType) - getSortWeight(bType);
            if (weightDiff !== 0) return weightDiff;
    
            if (aType === "japanese" && bType === "japanese") {
                const aKey = getJapaneseSortKey(a);
                const bKey = getJapaneseSortKey(b);
                // 先比較 az 分組
                const groupCompare = aKey.localeCompare(bKey, 'ja-JP');
                if (groupCompare !== 0) {
                    return groupCompare;
                }
                // 相同分組內按原始名稱排序
                return a.song_name.localeCompare(b.song_name, 'ja-JP');
            }
    
            return a.song_name.localeCompare(b.song_name, 'ja-JP');
        })
        .forEach((item) => {
            const row = createTableRow(item, numDates);
            songTableBody.appendChild(row);
        });

    // 更新總曲數（完整表格行數）
    const songCountElement = document.getElementById("songCount");
    if (songCountElement) {
        songCountElement.textContent = Object.keys(groupedData).length;
    }
}

// 初始化數據加載和搜索功能
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    let allData = [];
    let totalSongCount = 0; // 新增：儲存總曲目數的變數

    async function fetchData() {
        try {
            const response = await fetch("data.json", { cache: "no-cache" });
            const data = await response.json();
            allData = data;

            // 計算總曲目數（只在初次載入時計算一次）
            totalSongCount = Object.keys(
                data.reduce((acc, row) => {
                    const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
                    acc[key] = true;
                    return acc;
                }, {})
            ).length;

            // 顯示完整數據
            displayData(allData);

            // 更新總曲目數（只更新一次）
            const songCountElement = document.getElementById("songCount");
            if (songCountElement) {
                songCountElement.textContent = totalSongCount;
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            debounce(function (e) {
                const query = normalizeString(e.target.value.toLowerCase());

                if (isValidDateFormat(query)) {
                    const filteredData = allData.filter((row) =>
                        row.dates.some(
                            (date) =>
                                date.date ===
                                `${query.substring(4, 8)}${query.substring(
                                    2,
                                    4
                                )}${query.substring(0, 2)}`
                        )
                    );
                    displayData(filteredData);
                } else {
                    const filteredData = allData.filter(
                        (row) =>
                            normalizeString(row.song_name).includes(query) ||
                            normalizeString(row.artist).includes(query) ||
                            normalizeString(row.source).includes(query)
                    );
                    displayData(filteredData);
                }
                
                // 搜尋時不再更新 songCount，因此這裡不需要任何操作
            }, 800)
        );
    }

    fetchData();
});
