import os
import json
import re
import time
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime, timedelta, timezone
from googleapiclient.errors import HttpError
import html

# 從環境變量中讀取 Google API 憑證
google_sheets_credentials = os.getenv('GOOGLE_SHEETS_CREDENTIALS')
google_api_key = os.getenv('GOOGLE_API_KEY')

if not google_sheets_credentials or not google_api_key:
    raise ValueError("缺少Google API憑證或API密鑰")

try:
    credentials_info = json.loads(google_sheets_credentials)
    credentials = service_account.Credentials.from_service_account_info(credentials_info)
except Exception as e:
    raise ValueError("無效的Google Sheets憑證") from e

# YouTube Data API 客戶端
youtube = build('youtube', 'v3', developerKey=google_api_key)

def get_video_date(video_id):
    """獲取影片的實際直播日期"""
    try:
        request = youtube.videos().list(
            part='liveStreamingDetails,snippet',
            id=video_id
        )
        response = request.execute()
        
        if not response['items']:
            print(f"DEBUG: 無法找到影片 {video_id} 的資訊")
            return None
        
        video_details = response['items'][0]
        
        # 添加調試訊息
        print(f"DEBUG: 影片 {video_id} 的資訊：")
        print(f"DEBUG: 影片類型: {video_details['snippet'].get('liveBroadcastContent')}")
        print(f"DEBUG: 標題: {video_details['snippet'].get('title')}")
        
        # 檢查是否為會員限定直播
        if video_details['snippet'].get('liveBroadcastContent') == 'membersOnly':
            print(f"DEBUG: 跳過會員限定視頻：{video_id}")
            return None
        
        # 檢查是否為直播影片
        if 'liveStreamingDetails' in video_details:
            # 使用直播開始時間
            actual_start_time = video_details['liveStreamingDetails'].get('actualStartTime')
            if actual_start_time:
                # 直接解析時間，這已經是當地時間
                stream_date = datetime.strptime(actual_start_time, '%Y-%m-%dT%H:%M:%SZ')
                return stream_date.date()
        
        # 如果不是直播或沒有直播時間，使用發布時間
        publish_time = video_details['snippet']['publishedAt']
        publish_date = datetime.strptime(publish_time, '%Y-%m-%dT%H:%M:%SZ')
        return publish_date.date()
    except HttpError as e:
        print(f"Error fetching video date for {video_id}: {e}")
        return None

def get_video_ids_from_playlist(playlist_id):
    """從播放清單獲取影片ID和日期"""
    video_info = []
    
    # 計算最近30天的日期
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    # 格式化成 RFC 3339 格式
    published_after = thirty_days_ago.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    request = youtube.playlistItems().list(
        part='contentDetails,snippet',  # 添加 snippet
        playlistId=playlist_id,
        maxResults=50
    )
    
    while request:
        try:
            response = request.execute()
            for item in response['items']:
                video_id = item['contentDetails']['videoId']
                video_date = get_video_date(video_id)
                
                if video_date and video_date >= thirty_days_ago.date():
                    video_info.append((video_id, video_date))
                    print(f"找到影片：{video_id} 來自 {video_date}")
                    
            request = youtube.playlistItems().list_next(request, response)
        except HttpError as e:
            print(f"Error fetching playlist items: {e}")
            break
    
    return video_info

def get_video_ids_from_channel(channel_id):
    """從頻道獲取影片ID和日期"""
    video_info = []
    
    # 計算時間範圍
    current_time = datetime.now(timezone.utc)
    thirty_days_ago = current_time - timedelta(days=30)
    
    # 格式化時間為 ISO 8601 格式
    published_after = thirty_days_ago.strftime('%Y-%m-%dT%H:%M:%SZ')
    published_before = current_time.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    print(f"DEBUG: 搜尋時間範圍: {published_after} 到 {published_before}")
    
    request = youtube.search().list(
        part='snippet',
        channelId=channel_id,
        maxResults=50,
        order='date',
        type='video',
        publishedAfter=published_after,
        publishedBefore=published_before
    )
    
    while request:
        try:
            response = request.execute()
            items = response.get('items', [])
            print(f"DEBUG: 獲取到 {len(items)} 個影片")
            
            for item in response['items']:
                video_id = item['id']['videoId']
                snippet = item['snippet']
                title = snippet['title'].lower()
                print(f"DEBUG: 檢查影片: {snippet['title']}")
                
                # 檢查標題是否包含任何相關關鍵字
                keywords = ['歌枠', 'karaoke', 'カラオケ', 'singing']
                if any(keyword.lower() in title for keyword in keywords):
                    video_date = get_video_date(video_id)
                    if video_date:
                        video_info.append((video_id, video_date))
                        print(f"DEBUG: 找到符合的影片：{video_id} - {snippet['title']} - {video_date}")
                else:
                    print(f"DEBUG: 不符合關鍵字的影片：{snippet['title']}")
                
            # 檢查是否有下一頁
            if 'nextPageToken' in response:
                request = youtube.search().list_next(request, response)
            else:
                request = None
                
        except HttpError as e:
            print(f"DEBUG: API 錯誤: {str(e)}")
            break
            
    print(f"DEBUG: 總共找到 {len(video_info)} 個符合的影片")
    return video_info
    
def get_timestamp_comment(video_id):
    """獲取包含時間戳標記的留言"""
    try:
        request = youtube.commentThreads().list(
            part='snippet,replies',
            videoId=video_id,
            maxResults=100
        )

        while request:
            response = request.execute()
            for item in response['items']:
                # 檢查頂級評論
                comment = item['snippet']['topLevelComment']['snippet']['textDisplay']
                if '💐🌟🎶タイムスタンプ💐🌟🎶' in comment or '🌟💐🎶タイムスタンプ🌟💐🎶' in comment:
                    return comment
                
                # 檢查回覆評論
                if 'replies' in item:
                    for reply in item['replies']['comments']:
                        reply_comment = reply['snippet']['textDisplay']
                        if '💐🌟🎶タイムスタンプ💐🌟🎶' in reply_comment or '🌟💐🎶タイムスタンプ🌟💐🎶' in reply_comment:
                            return reply_comment

            request = youtube.commentThreads().list_next(request, response)
    
    except HttpError as e:
        print(f"Error fetching comments for video {video_id}: {e}")
        return None

    return None

def clean_html(raw_html):
    """移除HTML標籤並處理換行和特殊字符"""
    clean_text = re.sub(r'<br\s*/?>', '\n', raw_html)  # 替換 <br> 為換行符
    clean_text = re.sub(r'<.*?>', '', clean_text)  # 移除其他HTML標籤
    clean_text = html.unescape(clean_text)  # 轉換HTML實體為普通字符
    return clean_text

def save_to_file(video_id, comment, date):
    """保存留言到文件"""
    if not comment:
        print(f"未找到時間戳留言，視頻ID：{video_id}")
        return
        
    output_dir = 'timeline'
    os.makedirs(output_dir, exist_ok=True)
    
    file_name = date.strftime('%Y%m%d') + '.txt'
    file_path = os.path.join(output_dir, file_name)
    
    # 檢查文件是否已存在
    if os.path.exists(file_path):
        print(f"日期為 {file_name} 的文件已存在，跳過。")
        return
    
    # 清理HTML標籤
    clean_comment = clean_html(comment)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(f'ID = {video_id}\n')
        f.write(clean_comment)
        
    print(f"已保存時間戳留言到 {file_path}")

def main():
    playlist_id = 'PL7H5HbMMfm_lUoLIkPAZkhF_W0oDf5WEk'
    channel_id = 'UCwBJ-8LQYd7lZ7uW-4Adt4Q'

    print(f"DEBUG: 開始搜尋時間: {datetime.now(timezone.utc)}")
    
    # 從頻道獲取所有影片
    video_info = get_video_ids_from_channel(channel_id)
    print(f"DEBUG: 從頻道獲取到 {len(video_info)} 個影片")
    
    # 從播放清單獲取
    playlist_videos = get_video_ids_from_playlist(playlist_id)
    print(f"DEBUG: 從播放清單獲取到 {len(playlist_videos)} 個影片")
    
    video_info.extend(playlist_videos)
    
    # 移除重複前的數量
    print(f"DEBUG: 去重前總數: {len(video_info)}")
    
    # 移除重複
    video_info = list(set(video_info))
    print(f"DEBUG: 去重後總數: {len(video_info)}")
    
    batch_size = 10
    for i in range(0, len(video_info), batch_size):
        batch_videos = video_info[i:i + batch_size]
        for video_id, video_date in batch_videos:
            file_name = video_date.strftime('%Y%m%d') + '.txt'
            file_path = os.path.join('timeline', file_name)
            if os.path.exists(file_path):
                print(f"日期為 {file_name} 的文件已存在，跳過視頻ID {video_id}。")
                continue

            print(f"處理視頻 {video_id} 來自 {video_date}")
            timestamp_comment = get_timestamp_comment(video_id)
            if timestamp_comment:
                save_to_file(video_id, timestamp_comment, video_date)
        time.sleep(2)

if __name__ == '__main__':
    main()
