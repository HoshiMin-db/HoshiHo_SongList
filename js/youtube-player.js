document.addEventListener("DOMContentLoaded", function() {
    const validUrls = ['https://www.youtube.com', 'https://music.youtube.com', 'https://youtu.be'];

    // 統一的 URL 驗證函數
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

    function createYoutubeEmbed(url) {
        let videoId = '';
        let startTime = 0;
        const urlObj = new URL(url);

        if (url.includes('watch?v=')) {
            videoId = urlObj.searchParams.get('v');
            if (urlObj.searchParams.get('t')) {
                startTime = urlObj.searchParams.get('t').replace('s', '');
            }
        } else if (url.includes('youtu.be/')) {
            videoId = urlObj.pathname.substring(1);
            if (urlObj.searchParams.get('t')) {
                startTime = urlObj.searchParams.get('t').replace('s', '');
            }
        }

        return `https://www.youtube.com/embed/${videoId}?start=${startTime}`;
    }

    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

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
            floatingPlayer.src = createYoutubeEmbed(url);
            floatingPlayer.style.width = '100%';
            floatingPlayer.style.height = '100%';
            floatingPlayerContainer.style.display = 'block';
        }
    }

    function closeFloatingPlayer() {
        const floatingPlayerContainer = document.getElementById('floatingPlayerContainer');
        const floatingPlayer = document.getElementById('floatingPlayer');
        floatingPlayer.src = ''; // 清空 src 來停止播放
        floatingPlayerContainer.style.display = 'none';
    }

    // 將函數導出到全局作用域
    window.isValidYouTubeURL = isValidYouTubeURL;
    window.openFloatingPlayer = openFloatingPlayer;
    window.closeFloatingPlayer = closeFloatingPlayer;
});
