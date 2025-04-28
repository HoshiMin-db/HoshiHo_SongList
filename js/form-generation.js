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

    // 使用正則表達式反覆替換直到所有不安全字符被移除
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

    // 先進行安全性清理
    str = sanitizeInput(str);

    // 再進行原有的轉換
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

    // 確認日期是否有效
    const date = new Date(year, month - 1, day);
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

// 提取生成日期儲存格的公共邏輯
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

    // 點擊行爲檢查有效性
    link.onclick = function (event) {
        event.preventDefault();
        if (isValidYouTubeURL(link.href)) {
            openFloatingPlayer(link.href);
        } else {
            console.error("Invalid URL:", link.href);
        }
    };

    dateCell.appendChild(link);

    // 添加會員限定標識
    if (row.is_member_exclusive) {
        const lockIcon = document.createElement("span");
        lockIcon.classList.add("lock-icon");
        lockIcon.textContent = "🔒";
        dateCell.appendChild(lockIcon);
    }

    // 添加清唱標識
    if (row.is_acapella) {
        dateCell.classList.add("acapella");
    }

    // 添加私人影片標識
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

    // 按日期排序：從新到舊
    const sortedDates = item.dates.sort((a, b) => {
        const dateA = new Date(
            `${a.date.substring(0, 4)}-${a.date.substring(4, 6)}-${a.date.substring(6, 8)}T${a.time}`
        );
        const dateB = new Date(
            `${b.date.substring(0, 4)}-${b.date.substring(4, 6)}-${b.date.substring(6, 8)}T${b.time}`
        );
        return dateB - dateA; // 從新到舊排序
    });

    // 生成日期欄位
    const dateCount = Math.min(numDates, sortedDates.length);
    for (let i = 0; i < dateCount; i++) {
        createDateCell(sortedDates[i], newRow);
    }

    // 補充空白儲存格
    for (let i = dateCount; i < numDates; i++) {
        newRow.insertCell();
    }

    // 添加更多按鈕
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
                    const dateCell = createDateCell(row, newRow); // 使用公共邏輯
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

    function displayData(data, numDates = 3) {
        const songTableBody = document
            .getElementById("songTable")
            .getElementsByTagName("tbody")[0];

        songTableBody.innerHTML = "";

        // 分組數據：根據歌曲名稱和歌手進行分組（無視大小寫和符號）
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

        // 渲染表格
        Object.values(groupedData).forEach((item) => {
            const row = createTableRow(item, numDates);
            songTableBody.appendChild(row);
        });
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
            }, 800)
        );
    }

    fetchData();
});
