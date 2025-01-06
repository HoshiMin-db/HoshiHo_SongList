import { debounce, normalizeString } from './utils.js';
import { fetchAndDisplayData } from './data.js';

document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const showAllButton = document.getElementById('showAllButton');

    searchInput.addEventListener('input', debounce(function(e) {
        const query = normalizeString(e.target.value.toLowerCase());
        fetchAndDisplayData(query);
    }, 300));

    showAllButton.addEventListener('click', function() {
        const showAllState = !showAllButton.classList.contains('button-on');
        showAllButton.classList.toggle('button-on', showAllState);
        showAllButton.classList.toggle('button-off', !showAllState);
        showAllButton.textContent = showAllState ? "隱藏" : "顯示全部";

        fetchAndDisplayData('', showAllState ? Infinity : 3);
    });
});
