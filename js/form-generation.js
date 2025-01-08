// form-generation.js
import './events.js';
import { fetchData, fetchAndDisplayData } from './data.js';
import { debounce, normalizeString } from './utils.js';

document.addEventListener("DOMContentLoaded", function() {
    // 頁面加載時顯示全部表單
    fetchData(() => fetchAndDisplayData(''));
});
