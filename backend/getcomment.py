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
    """獲取影片的直播或發布日期"""
    try:
        response = youtube.videos().list(
            part='liveStreamingDetails,snippet',
            id=video_id
        ).execute()
        
        if not response.get('items'):
            return None
        
        video_details = response['items'][0]
        
        # 檢查是否為會員限定
        if video_details['snippet'].get('liveBroadcastContent') == 'membersOnly':
            return None
        
        # 檢查直播相關時間
        if 'liveStreamingDetails' in video_details:
            for time_field in ['actualStartTime', 'scheduledStartTime']:
                if time_field in video_details['liveStreamingDetails']:
                    return datetime.strptime(
                        video_details['liveStreamingDetails'][time_field], 
                        '%Y-%m-%dT%H:%M:%SZ'
                    ).date()
        
        # 如果都沒有，使用發布時間
        return datetime.strptime(
            video_details['snippet']['publishedAt'], 
            '%Y-%m-%dT%H:%M:%SZ'
        ).date()
        
    except HttpError as e:
        print(f"Error fetching video date for {video_id}: {e}")
        return None

def get_video_ids_from_playlist(playlist_id):
    """從播放清單獲取最近30天的影片ID和日期"""
    video_info = []
    
    # 計算最近30天的日期
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    request = youtube.playlistItems().list(
        part='snippet',  # 只需要 snippet 就足夠了
        playlistId=playlist_id,
        maxResults=50
    )
    
    while request:
        try:
            response = request.execute()
            items = response.get('items', [])
            
            for item in items:
                published_time = datetime.strptime(
                    item['snippet']['publishedAt'], 
                    '%Y-%m-%dT%H:%M:%SZ'
                ).replace(tzinfo=timezone.utc)
                
                # 如果超過30天就停止檢查
                if published_time < thirty_days_ago:
                    return video_info
                
                video_id = item['snippet']['resourceId']['videoId']
                video_date = get_video_date(video_id)
                if video_date:
                    video_info.append((video_id, video_date))
                    print(f"找到播放清單影片：{video_id} 來自 {video_date}")
            
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
                    break  # 使用 break 而不是設置 request = None
                
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
            
            if published_time < thirty_days_ago:
                break
                
            # 獲取下一頁
            if 'nextPageToken' in response:
                request = youtube.playlistItems().list_next(request, response)
            else:
                break  # 使用 break 而不是設置 request = None
            
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

        timestamp_markers = ['💐🌟🎶タイムスタンプ💐🌟🎶', '🌟💐🎶タイムスタンプ🌟💐🎶']
        
        while request:
            response = request.execute()
            for item in response['items']:
                # 檢查頂級評論
                comment = item['snippet']['topLevelComment']['snippet']['textDisplay']
                if any(marker in comment for marker in timestamp_markers):
                    return comment
                
                # 檢查回覆評論
                if 'replies' in item:
                    for reply in item['replies']['comments']:
                        reply_text = reply['snippet']['textDisplay']
                        if any(marker in reply_text for marker in timestamp_markers):
                            return reply_text

            request = youtube.commentThreads().list_next(request, response)
            
    except HttpError as e:
        print(f"Error fetching comments for video {video_id}: {e}")
    
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
    channel_id = 'UCDqn3HdMA5zwlYvsQ1YSG4Q'
    playlist_id = 'PL7H5HbMMfm_lUoLIkPAZkhF_W0oDf5WEk'
    start_time = datetime.now(timezone.utc)
    
    print(f"DEBUG: 開始時間: {start_time}")
    
    # 收集所有影片資訊
    video_info = get_video_ids_from_channel(channel_id)
    video_info.extend(get_video_ids_from_playlist(playlist_id))
    
    # 去重並排序
    video_info = sorted(set(video_info), key=lambda x: x[1], reverse=True)
    print(f"DEBUG: 找到 {len(video_info)} 個唯一影片")
    
    # 處理每個影片
    for video_id, video_date in video_info:
        file_name = f"{video_date:%Y%m%d}.txt"
        file_path = os.path.join('timeline', file_name)
        
        if os.path.exists(file_path):
            print(f"DEBUG: 檔案已存在，跳過 {video_id} ({video_date})")
            continue
        
        if timestamp_comment := get_timestamp_comment(video_id):
            save_to_file(video_id, timestamp_comment, video_date)

if __name__ == '__main__':
    main()
