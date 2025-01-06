// js/form-generation.js
import './events.js';
import { fetchData } from './data.js';

document.addEventListener("DOMContentLoaded", function() {
    fetchData(() => fetchAndDisplayData(''));
});
