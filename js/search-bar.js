// ==================== js/search-bar.js ====================
import { convert_jp } from "./romaji.js";

// 內部正則表達式（原由 form-generation.js 抽離）
const JAPANESE_HIRAGANA = /[\u3040-\u309F]/;
const JAPANESE_KATAKANA = /[\u30A0-\u30FF]/;

// 導出工具函數，確保 form-generation.js 的排序功能可以跨檔案引用相同邏輯
export function sanitizeInput(input) {
    if (typeof input !== "string") return "";
    return input.replace(/[<>&'"]/g, "")
                .replace(/[\x00-\x1F\x7F]/g, "");
}

export function normalizeString(str) {
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

export function isValidDateFormat(dateStr) {
    if (!/^\d{8}$/.test(dateStr)) return false;
    const date = new Date(
        `${dateStr.slice(4)}-${dateStr.slice(2,4)}-${dateStr.slice(0,2)}`
    );
    return date.toISOString().slice(0,10) === `${dateStr.slice(4)}-${dateStr.slice(2,4)}-${dateStr.slice(0,2)}`;
}

// 防抖函數移至此處，優化輸入監聽
function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 搜尋與標籤面板管理類別
export default class SearchBarManager {
    constructor({ searchInputId, tagToggleId, tagsFilterContainerId, tagButtonsId, onUpdate }) {
        this.searchInput = document.getElementById(searchInputId);
        this.tagToggle = document.getElementById(tagToggleId);
        this.tagsFilterContainer = document.getElementById(tagsFilterContainerId);
        this.tagButtons = document.getElementById(tagButtonsId);
        this.onUpdate = onUpdate; // 當過濾條件變更時的回呼通知 (Callback)
        
        this.selectedTags = new Set();
        this.query = "";

        this.initEvents();
    }

    // 初始化 UI 監聽事件
    initEvents() {
        // 1. 搜尋欄輸入事件 (帶防抖)
        if (this.searchInput) {
            this.searchInput.addEventListener("input", debounce(() => {
                this.query = normalizeString(this.searchInput.value.toLowerCase());
                this.onUpdate(); // 通知主程式更新列表
            }, 800));
        }

        // 2. 展開/收合 Tags 欄位按鈕邏輯
        if (this.tagToggle && this.tagsFilterContainer) {
            this.tagToggle.addEventListener('click', () => {
                const isExpanded = this.tagToggle.getAttribute('aria-expanded') === 'true';
                this.tagToggle.setAttribute('aria-expanded', String(!isExpanded));
                this.tagsFilterContainer.classList.toggle('collapsed');
            });
        }
    }

    // 提供對外的狀態讀取介面
    getQuery() {
        return this.query;
    }

    getSelectedTags() {
        return this.selectedTags;
    }

    // 更新標籤按鈕的選取狀態樣式
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

    // 建立單個標籤按鈕 DOM
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
            this.onUpdate(); // 通知主程式更新列表
        });
        
        return button;
    }

    // 動態渲染所有標籤按鈕
    populateTagFilter(allTags) {
        if (!this.tagButtons) return;
        
        this.tagButtons.innerHTML = '';
        this.tagButtons.appendChild(this.createTagButton(''));
        
        allTags.forEach(tag => {
            this.tagButtons.appendChild(this.createTagButton(tag));
        });
    }
}