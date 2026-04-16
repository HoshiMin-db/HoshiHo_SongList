document.addEventListener("DOMContentLoaded", function() {
    const validUrls = ['https://www.youtube.com', 'https://music.youtube.com', 'https://youtu.be'];

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

    // 創建 YouTube Embed URL
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

    // 浮動播放器（index.html）
    function openFloatingPlayer(url) {
        if (!isValidYouTubeURL(url)) {
            console.error("Invalid YouTube URL:", url);
            return;
        }

        if (isMobileDevice()) {
            window.open(url, '_blank');
        } else {
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

    // 卡片內播放 XFD（disc.html）
    function playXFDInCard(element, videoId) {
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
            console.error('Error playing XFD in card:', error);
        }
    }

    // 卡片內播放曲目（disc.html）
    function playTrackInCard(element, videoUrl) {
        try {
            if (!isValidYouTubeURL(videoUrl)) {
                console.error("Invalid YouTube URL:", videoUrl);
                return;
            }

            const videoId = extractVideoId(videoUrl);
            if (!videoId) {
                console.error("Could not extract video ID from URL:", videoUrl);
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

            const embedUrl = createYoutubeEmbedFromId(videoId);
            if (embedUrl) {
                videoContainer.innerHTML = `
                    <iframe src="${embedUrl}" 
                            allowfullscreen 
                            style="width: 100%; height: 100%; border: none;"></iframe>
                `;
            }
        } catch (error) {
            console.error('Error playing track in card:', error);
        }
    }

    // 將函數導出到全局作用域
    window.isValidYouTubeURL = isValidYouTubeURL;
    window.extractVideoId = extractVideoId;
    window.createYoutubeEmbed = createYoutubeEmbed;
    window.createYoutubeEmbedFromId = createYoutubeEmbedFromId;
    window.openFloatingPlayer = openFloatingPlayer;
    window.closeFloatingPlayer = closeFloatingPlayer;
    window.playXFDInCard = playXFDInCard;
    window.playTrackInCard = playTrackInCard;
});
