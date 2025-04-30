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

// 初始化數據加載和計算功能
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const songCountElement = document.getElementById("songCount");
    const songTableBody = document
        .getElementById("songTable")
        .getElementsByTagName("tbody")[0];
    let allData = [];

    async function fetchData() {
        try {
            const response = await fetch("data.json", { cache: "no-cache" });
            const data = await response.json();
            allData = data;
            displayData(allData);

            // 設置總曲目數量
            if (songCountElement) {
                songCountElement.textContent = allData.length; // 此處統計總曲數
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

// 顯示數據並排序
function displayData(data) {
    const songTableBody = document
        .getElementById("songTable")
        .getElementsByTagName("tbody")[0];

    songTableBody.innerHTML = "";

    // 分組數據
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

    // 排序數據
    Object.values(groupedData)
        .sort((a, b) => a.song_name.localeCompare(b.song_name))
        .forEach((item) => {
            const newRow = document.createElement("tr");

            const initialCell = newRow.insertCell();
            initialCell.textContent =
                item.az || item.song_name.charAt(0).toUpperCase();

            const songNameCell = newRow.insertCell();
            songNameCell.textContent = item.song_name;

            if (item.is_copyright) {
                songNameCell.style.color = "red";
            }

            newRow.insertCell().textContent = item.artist;
            newRow.insertCell().textContent = item.source || "";

            songTableBody.appendChild(newRow);
        });
}
