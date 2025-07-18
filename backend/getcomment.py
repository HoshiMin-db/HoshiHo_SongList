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
    """從頻道獲取最近30天的歌枠直播"""
    video_info = []
    
    try:
        # 計算時間範圍
        current_time = datetime.now(timezone.utc)
        thirty_days_ago = current_time - timedelta(days=30)
        
        print(f"DEBUG: 開始搜尋 {thirty_days_ago.strftime('%Y-%m-%d')} 到 {current_time.strftime('%Y-%m-%d')} 的歌枠直播")
        
        # 獲取頻道的上傳播放清單
        channel_response = youtube.channels().list(
            part='contentDetails',
            id=channel_id
        ).execute()
        
        if not channel_response.get('items'):
            print(f"DEBUG: 無法獲取頻道 {channel_id} 的資訊")
            return []
        
        # 獲取上傳播放清單 ID
        uploads_playlist_id = channel_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        print(f"DEBUG: 上傳播放清單 ID: {uploads_playlist_id}")
        
        # 使用 playlistItems 獲取影片列表
        request = youtube.playlistItems().list(
            part='snippet',
            playlistId=uploads_playlist_id,
            maxResults=50  # 每頁最大數量
        )
        
        while request:
            response = request.execute()
            items = response.get('items', [])
            
            if not items:
                print("DEBUG: 沒有找到任何影片")
                break
                
            print(f"DEBUG: 獲取到 {len(items)} 個影片")
            
            for item in items:
                snippet = item['snippet']
                video_id = snippet['resourceId']['videoId']
                title = snippet['title']
                published_time = datetime.strptime(
                    snippet['publishedAt'], 
                    '%Y-%m-%dT%H:%M:%SZ'
                ).replace(tzinfo=timezone.utc)
                
                # 如果影片發布時間早於30天前，就停止搜尋
                if published_time < thirty_days_ago:
                    print(f"DEBUG: 已到達30天前的影片，停止搜尋")
                    request = None
                    break
                
                # 檢查標題是否包含關鍵字（不區分大小寫）
                if ('歌枠' in title or 'karaoke' in title.lower()):
                    print(f"DEBUG: 找到歌枠直播: {title}")
                    
                    # 獲取影片詳細資訊
                    video_response = youtube.videos().list(
                        part='liveStreamingDetails,snippet',
                        id=video_id
                    ).execute()
                    
                    if not video_response.get('items'):
                        print(f"DEBUG: 無法獲取影片 {video_id} 的詳細資訊")
                        continue
                    
                    video_details = video_response['items'][0]
                    
                    # 獲取直播時間
                    if 'liveStreamingDetails' in video_details:
                        # 優先使用實際開始時間，如果沒有則使用預定開始時間
                        actual_start = video_details['liveStreamingDetails'].get('actualStartTime')
                        scheduled_start = video_details['liveStreamingDetails'].get('scheduledStartTime')
                        
                        if actual_start:
                            stream_date = datetime.strptime(actual_start, '%Y-%m-%dT%H:%M:%SZ')
                            print(f"DEBUG: 使用實際開始時間: {stream_date}")
                        elif scheduled_start:
                            stream_date = datetime.strptime(scheduled_start, '%Y-%m-%dT%H:%M:%SZ')
                            print(f"DEBUG: 使用預定開始時間: {stream_date}")
                        else:
                            stream_date = datetime.strptime(
                                video_details['snippet']['publishedAt'], 
                                '%Y-%m-%dT%H:%M:%SZ'
                            )
                            print(f"DEBUG: 使用發布時間: {stream_date}")
                        
                        video_info.append((video_id, stream_date.date()))
                        print(f"DEBUG: 已加入清單: {video_id} - {title} - {stream_date.date()}")
                
            # 獲取下一頁
            request = youtube.playlistItems().list_next(request, response)
            
        print(f"DEBUG: 總共找到 {len(video_info)} 個歌枠直播")
        
    except HttpError as e:
        print(f"DEBUG: YouTube API 錯誤: {str(e)}")
    except Exception as e:
        print(f"DEBUG: 未預期的錯誤: {str(e)}")
    
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
    channel_id = 'UCwBJ-8LQYd7lZ7uW-4Adt4Q'
    playlist_id = 'PL7H5HbMMfm_lUoLIkPAZkhF_W0oDf5WEk'

    print(f"DEBUG: 開始時間: {datetime.now(timezone.utc)}")
    
    # 從頻道獲取歌枠直播
    video_info = get_video_ids_from_channel(channel_id)
    print(f"DEBUG: 從頻道獲取到 {len(video_info)} 個歌枠直播")
    
    # 從播放清單獲取影片
    playlist_videos = get_video_ids_from_playlist(playlist_id)
    video_info.extend(playlist_videos)
    
    # 顯示處理狀態
    print(f"DEBUG: 去重前總數: {len(video_info)}")
    video_info = list(set(video_info))
    print(f"DEBUG: 去重後總數: {len(video_info)}")
    
    # 處理每個影片
    for video_id, video_date in sorted(video_info, key=lambda x: x[1], reverse=True):
        file_name = video_date.strftime('%Y%m%d') + '.txt'
        file_path = os.path.join('timeline', file_name)
        
        if os.path.exists(file_path):
            print(f"DEBUG: 檔案已存在，跳過 {video_id} ({video_date})")
            continue
            
        print(f"DEBUG: 處理影片 {video_id} ({video_date})")
        timestamp_comment = get_timestamp_comment(video_id)
        if timestamp_comment:
            save_to_file(video_id, timestamp_comment, video_date)

if __name__ == '__main__':
    main()
