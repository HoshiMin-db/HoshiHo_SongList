import './events.js';
import { fetchData, fetchAndDisplayData } from './data.js';

document.addEventListener("DOMContentLoaded", function() {
    fetchData(() => fetchAndDisplayData(''));
});
