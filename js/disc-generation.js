// disc-generation.js

// YouTube API 相關配置
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // 從環境變量獲取 API key
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

// YouTube 連結類型定義
const YT_TYPES = {
    PLAYLIST: 'playlist',
    VIDEO: 'video',
    MUSIC_TRACK: 'music_track'
};

// 解析 YouTube URL 或 ID
function parseYouTubeId(url) {
    try {
        if (!url.includes('/') && !url.includes('.')) {
            return {
                id: url,
                type: url.length > 20 ? YT_TYPES.PLAYLIST : YT_TYPES.VIDEO
            };
        }

        const urlObj = new URL(url);
        
        if (urlObj.hostname === 'music.youtube.com' && urlObj.searchParams.has('list')) {
            return {
                id: urlObj.searchParams.get('list'),
                type: YT_TYPES.PLAYLIST
            };
        }
        
        if (urlObj.hostname === 'music.youtube.com' && urlObj.pathname.includes('/watch')) {
            return {
                id: urlObj.searchParams.get('v'),
                type: YT_TYPES.MUSIC_TRACK
            };
        }

        if (urlObj.searchParams.has('list')) {
            return {
                id: urlObj.searchParams.get('list'),
                type: YT_TYPES.PLAYLIST
            };
        }

        if (urlObj.pathname.includes('/watch') || urlObj.hostname === 'youtu.be') {
            const videoId = urlObj.hostname === 'youtu.be' 
                ? urlObj.pathname.slice(1)
                : urlObj.searchParams.get('v');
            return {
                id: videoId,
                type: YT_TYPES.VIDEO
            };
        }

    } catch (error) {
        console.error('Error parsing YouTube URL:', error);
    }
    return null;
}

// 從 YouTube API 獲取播放列表信息
async function fetchPlaylistItems(playlistId) {
    try {
        const response = await fetch(
            `${YT_API_BASE}/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        
        if (data.error) {
            console.error('YouTube API Error:', data.error);
            return [];
        }

        return data.items.map(item => ({
            title: item.snippet.title,
            credits: item.snippet.description || ''
        }));
    } catch (error) {
        console.error('Error fetching playlist items:', error);
        return [];
    }
}

// 從 YouTube API 獲取視頻信息
async function fetchVideoDetails(videoId) {
    try {
        const response = await fetch(
            `${YT_API_BASE}/videos?part=snippet&id=${videoId}&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();

        if (data.error) {
            console.error('YouTube API Error:', data.error);
            return null;
        }

        const video = data.items[0];
        return [{
            title: video.snippet.title,
            credits: video.snippet.description || ''
        }];
    } catch (error) {
        console.error('Error fetching video details:', error);
        return null;
    }
}

// 根據類型獲取 YouTube 內容
async function fetchYouTubeContent(ytInfo) {
    if (ytInfo.type === YT_TYPES.PLAYLIST) {
        return await fetchPlaylistItems(ytInfo.id);
    } else {
        return await fetchVideoDetails(ytInfo.id);
    }
}

// 從文本文件讀取專輯基本信息
async function loadDiscData() {
    try {
        const response = await fetch('disc.txt');
        const text = await response.text();
        
        const discography = {
            armony: { name: "Armony", description: "音樂企劃Armony的作品", albums: [] },
            other_circles: { name: "Other Circles", description: "參與其他社團的作品", albums: [] },
            solo: { name: "Solo Works", description: "個人作品", albums: [] }
        };

        let currentCategory = null;
        
        // 解析文本文件
        for (const line of text.split('\n')) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                const categoryName = trimmedLine.slice(1, -1);
                switch (categoryName) {
                    case 'Armony': currentCategory = 'armony'; break;
                    case 'Other Circles': currentCategory = 'other_circles'; break;
                    case 'Solo Works': currentCategory = 'solo'; break;
                }
                continue;
            }

            if (currentCategory) {
                const [title, type, releaseDate, ytUrl, linkcore] = trimmedLine.split('|');
                if (title && ytUrl) {
                    const ytInfo = parseYouTubeId(ytUrl.trim());
                    const tracks = await fetchYouTubeContent(ytInfo);
                    
                    discography[currentCategory].albums.push({
                        title: title.trim(),
                        type: type.trim(),
                        releaseDate: releaseDate.trim(),
                        ytInfo: ytInfo,
                        linkcore: linkcore ? linkcore.trim() : null,
                        tracks: tracks || []
                    });
                }
            }
        }

        return discography;
    } catch (error) {
        console.error('Error loading disc data:', error);
        return null;
    }
}

// 創建專輯卡片的HTML
function createAlbumCard(album) {
    const tracksList = album.tracks.map((track, index) => `
        <li class="track-item">
            <span class="track-number">${index + 1}</span>
            <div class="track-info">
                <div class="track-title">${track.title}</div>
                <div class="track-credit">${track.credits}</div>
            </div>
        </li>
    `).join('');

    const ytInfo = album.ytInfo;
    const ytLink = ytInfo.type === YT_TYPES.PLAYLIST 
        ? `https://music.youtube.com/playlist?list=${ytInfo.id}`
        : `https://youtu.be/${ytInfo.id}`;

    return `
        <div class="disc-card">
            <div class="disc-header">
                <div class="disc-title">${album.title}</div>
                <div class="disc-type">${album.type}</div>
                <div class="disc-release-date">${album.releaseDate}</div>
            </div>
            ${createEmbedPlayer(album.ytInfo)}
            <ul class="track-list">
                ${tracksList}
            </ul>
            <div class="external-links">
                <a href="${ytLink}" target="_blank" class="external-link">
                    ${ytInfo.type === YT_TYPES.PLAYLIST ? 'YouTube Music' : 'YouTube'}
                </a>
                ${album.linkcore ? `
                    <a href="https://linkco.re/${album.linkcore}" 
                       target="_blank" class="external-link">其他平台</a>
                ` : ''}
            </div>
        </div>
    `;
}

// 生成整個專輯列表
async function generateDiscography() {
    const container = document.getElementById('discography-container');
    if (!container) return;

    const discography = await loadDiscData();
    if (!discography) return;

    Object.entries(discography).forEach(([key, category]) => {
        if (category.albums.length === 0) return;

        const categoryHtml = `
            <div class="category-section" id="${key}">
                <h2 class="category-title">${category.name}</h2>
                <p class="category-description">${category.description}</p>
                <div class="disc-container">
                    ${category.albums.map(album => createAlbumCard(album)).join('')}
                </div>
            </div>
        `;

        container.innerHTML += categoryHtml;
    });
}

// 頁面加載時生成專輯列表
document.addEventListener('DOMContentLoaded', generateDiscography);

// 導出函數供其他文件使用
export { generateDiscography };
