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

// 新增一個函數來判斷字符類型
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
        if (isValidYouTubeURL(link.href)) {
            openFloatingPlayer(link.href);
        } else {
            console.error("Invalid URL:", link.href);
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

    const dateCount = Math.min(numDates, sortedDates.length);
    for (let i = 0; i < dateCount; i++) {
        createDateCell(sortedDates[i], newRow);
    }

    for (let i = dateCount; i < numDates; i++) {
        newRow.insertCell();
    }

    if (sortedDates.length > numDates) {
        const moreButtonCell = newRow.insertCell();
        const moreButton = document.createElement("button");
        moreButton.textContent = "...";
        moreButton.className = "more-button";
        moreButton.onclick = () => {
            const isExpanded =
                moreButton.getAttribute("data-expanded") === "true";

            if (isExpanded) {
                const toRemove = newRow.querySelectorAll(".extra-date");
                toRemove.forEach((el) => el.remove());
                moreButton.setAttribute("data-expanded", "false");
            } else {
                sortedDates.slice(numDates).forEach((row) => {
                    const dateCell = createDateCell(row, newRow);
                    dateCell.classList.add("date-cell", "extra-date");
                });
                moreButton.setAttribute("data-expanded", "true");
            }
        };
        moreButtonCell.appendChild(moreButton);
    } else {
        newRow.insertCell();
    }

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

    Object.values(groupedData)
        .sort((a, b) => {
            const aType = getCharacterType(a.song_name);
            const bType = getCharacterType(b.song_name);

            const weightDiff = getSortWeight(aType) - getSortWeight(bType);
            if (weightDiff !== 0) return weightDiff;

            if (aType === "japanese" && bType === "japanese") {
                const aKey = a.az || a.song_name.charAt(0).toUpperCase();
                const bKey = b.az || b.song_name.charAt(0).toUpperCase();
                const groupCompare = aKey.localeCompare(bKey, "ja-JP");
                if (groupCompare !== 0) return groupCompare;
            }

            return a.song_name.localeCompare(b.song_name, "ja-JP");
        })
        .forEach((item) => {
            const row = createTableRow(item, numDates);
            songTableBody.appendChild(row);
        });

    // 更新總曲數
    const songCountElement = document.getElementById("songCount");
    if (songCountElement) {
        songCountElement.textContent = Object.keys(groupedData).length;
    }
}

// 初始化數據加載和搜索功能
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    let allData = [];

    async function fetchData() {
        try {
            const response = await fetch("data.json", { cache: "no-cache" });
            const data = await response.json();
            allData = data;
            displayData(allData);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            debounce(function (e) {
                const query = normalizeString(e.target.value.toLowerCase());
                const filteredData = allData.filter(
                    (row) =>
                        normalizeString(row.song_name).includes(query) ||
                        normalizeString(row.artist).includes(query)
                );
                displayData(filteredData);
            }, 800)
        );
    }

    fetchData();
});
