document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const showAllButton = document.getElementById('showAllButton');

    searchInput.addEventListener('input', debounce(function(e) {
        const query = normalizeString(e.target.value.toLowerCase());
        fetchAndDisplayData(query);
    }, 300));

    showAllButton.addEventListener('click', function() {
        showAllState = !showAllState;
        showAllButton.classList.toggle('button-on', showAllState);
        showAllButton.classList.toggle('button-off', !showAllState);
        showAllButton.textContent = showAllState ? "隱藏" : "顯示全部";

        if (showAllState) {
            displayData(allData, allData.length); // 顯示所有日期
        } else {
            fetchAndDisplayData(''); // 顯示最近3個日期
        }
    });
});
