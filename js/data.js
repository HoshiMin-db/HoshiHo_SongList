import { normalizeString, sortTable } from './utils.js';
import { generateForm } from './form-generation.js';

let allData = [];
let totalSongCount = 0;

export function fetchData(callback) {
    fetch('data.json', { cache: 'no-cache' })
        .then(response => response.json())
        .then(data => {
            allData = data;
            if (totalSongCount === 0) {
                const uniqueSongs = new Set(data.map(item => `${normalizeString(item.song_name)}-${normalizeString(item.artist)}`));
                totalSongCount = uniqueSongs.size;
                document.getElementById('songCount').textContent = totalSongCount;
            }
            callback();
        });
}

export function fetchAndDisplayData(query) {
    const filteredData = allData.filter(row =>
        normalizeString(row.song_name).toLowerCase().includes(query) ||
        normalizeString(row.artist).toLowerCase().includes(query) ||
        normalizeString(row.source).toLowerCase().includes(query)
    );

    const replaceSongs = {
        'rorikami': '粛聖‼ ロリ神レクイエム☆'
    };
    filteredData.forEach(row => {
        if (replaceSongs[row.song_name]) {
            row.song_name = replaceSongs[row.song_name];
        }
    });

    generateForm(filteredData);
}
