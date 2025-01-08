// form-generation.js
import { fetchData, fetchAndDisplayData } from './data.js';
import './events.js';

document.addEventListener("DOMContentLoaded", function() {
    // 頁面加載時顯示全部表單
    fetchData(() => fetchAndDisplayData(''));
});
