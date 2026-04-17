document.addEventListener("DOMContentLoaded", function() {
    const validUrls = ['https://www.youtube.com', 'https://music.youtube.com', 'https://youtu.be'];
    const YT_TYPES = {
        PLAYLIST: 'playlist',
        VIDEO: 'video',
        MUSIC_TRACK: 'music_track'
    };

    // URL 驗證
    function isValidYouTubeURL(url) {
        try {
            const urlObj = new URL(url);
            return validUrls.some(validUrl => 
                urlObj.origin === validUrl || 
                (validUrl === 'https://youtu.be' && urlObj.hostname === 'youtu.be')
            );
        } catch (e) {
            return false;
        }
    }

    // 統一的 URL 解析函數（替代 disc-generation.js 的 parseYouTubeId）
    function parseYouTubeUrl(url) {
        try {
            if (url.startsWith('OLAK5uy_')) {
                return {
                    id: url,
                    type: YT_TYPES.PLAYLIST
                };
            }

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
            console.error('Error parsing YouTube URL:', error, 'URL:', url);
        }
        return {
            id: url,
            type: YT_TYPES.PLAYLIST
        };
    }

    // 提取 Video ID
    function extractVideoId(url) {
        try {
            const urlObj = new URL(url);
            
            if (url.includes('watch?v=')) {
                return urlObj.searchParams.get('v');
            } else if (url.includes('youtu.be/')) {
                return urlObj.pathname.substring(1).split('?')[0];
            }
        } catch (e) {
            console.error('Error extracting video ID:', e);
        }
        return null;
    }

    //  創建 YouTube Embed URL
    function createYoutubeEmbed(url) {
        if (!isValidYouTubeURL(url)) {
            console.error("Invalid YouTube URL:", url);
            return null;
        }

        let videoId = '';
        let startTime = 0;
        const urlObj = new URL(url);

        if (url.includes('watch?v=')) {
            videoId = urlObj.searchParams.get('v');
            if (urlObj.searchParams.get('t')) {
                startTime = urlObj.searchParams.get('t').replace('s', '');
            }
        } else if (url.includes('youtu.be/')) {
            videoId = urlObj.pathname.substring(1).split('?')[0];
            if (urlObj.searchParams.get('t')) {
                startTime = urlObj.searchParams.get('t').replace('s', '');
            }
        }

        if (!videoId) {
            console.error("Could not extract video ID from URL:", url);
            return null;
        }

        return `https://www.youtube.com/embed/${videoId}?start=${startTime}&controls=1&modestbranding=1`;
    }

    // 從 Video ID 創建 Embed URL
    function createYoutubeEmbedFromId(videoId) {
        if (!videoId || typeof videoId !== 'string' || videoId.trim() === '') {
            console.error("Invalid video ID:", videoId);
            return null;
        }
        return `https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1`;
    }

    // 裝置偵測
    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    // 在卡片內播放影片（disc.html）
    function playInCard(element, url) {
        try {
            // 驗證 URL
            if (!isValidYouTubeURL(url)) {
                console.error("Invalid YouTube URL:", url);
                return;
            }

            const card = element.closest('.disc-card');
            if (!card) {
                console.error('Card not found');
                return;
            }

            const videoContainer = card.querySelector('.disc-video-container');
            if (!videoContainer) {
                console.error('Video container not found');
                return;
            }

            const embedUrl = createYoutubeEmbed(url);
            if (embedUrl) {
                videoContainer.innerHTML = `
                    <iframe src="${embedUrl}" 
                            allowfullscreen 
                            style="width: 100%; height: 100%; border: none;"></iframe>
                `;
            }
        } catch (error) {
            console.error('Error playing in card:', error);
        }
    }

    // 在卡片內播放影片（使用 Video ID）
    function playInCardById(element, videoId) {
        try {
            if (!videoId || typeof videoId !== 'string' || videoId.trim() === '') {
                console.error("Invalid video ID:", videoId);
                return;
            }

            const card = element.closest('.disc-card');
            if (!card) {
                console.error('Card not found');
                return;
            }

            const videoContainer = card.querySelector('.disc-video-container');
            if (!videoContainer) {
                console.error('Video container not found');
                return;
            }

            const embedUrl = createYoutubeEmbedFromId(videoId.trim());
            if (embedUrl) {
                videoContainer.innerHTML = `
                    <iframe src="${embedUrl}" 
                            allowfullscreen 
                            style="width: 100%; height: 100%; border: none;"></iframe>
                `;
            }
        } catch (error) {
            console.error('Error playing in card:', error);
        }
    }

    // 浮動播放器（index.html）
    function openFloatingPlayer(url) {
        // 驗證 URL 的安全性
        if (!isValidYouTubeURL(url)) {
            console.error("Invalid YouTube URL:", url);
            return;
        }

        if (isMobileDevice()) {
            // 行動設備直接打開 YouTube
            window.open(url, '_blank');
        } else {
            // 桌面設備使用浮動播放器
            const floatingPlayerContainer = document.getElementById('floatingPlayerContainer');
            const floatingPlayer = document.getElementById('floatingPlayer');
            
            if (!floatingPlayerContainer || !floatingPlayer) {
                console.error('Floating player container not found');
                return;
            }

            const embedUrl = createYoutubeEmbed(url);
            if (embedUrl) {
                floatingPlayer.src = embedUrl;
                floatingPlayer.style.width = '100%';
                floatingPlayer.style.height = '100%';
                floatingPlayerContainer.style.display = 'block';
            }
        }
    }

    function closeFloatingPlayer() {
        const floatingPlayerContainer = document.getElementById('floatingPlayerContainer');
        const floatingPlayer = document.getElementById('floatingPlayer');
        
        if (floatingPlayerContainer && floatingPlayer) {
            floatingPlayer.src = '';
            floatingPlayerContainer.style.display = 'none';
        }
    }

    // 將函數導出到全局作用域
    window.isValidYouTubeURL = isValidYouTubeURL;
    window.parseYouTubeUrl = parseYouTubeUrl;  
    window.extractVideoId = extractVideoId;
    window.createYoutubeEmbed = createYoutubeEmbed;
    window.createYoutubeEmbedFromId = createYoutubeEmbedFromId;
    window.openFloatingPlayer = openFloatingPlayer;
    window.closeFloatingPlayer = closeFloatingPlayer;
    window.playInCard = playInCard;
    window.playInCardById = playInCardById;
});
