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
            return None
        
        video_details = response['items'][0]
        
        # 檢查是否為會員限定直播
        if video_details['snippet'].get('liveBroadcastContent') == 'membersOnly':
            print(f"跳過會員限定視頻：{video_id}")
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
    request = youtube.playlistItems().list(
        part='contentDetails',
        playlistId=playlist_id,
        maxResults=50
    )
    
    # 計算最近30天的日期
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
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
    
    # 獲取播放清單中的所有影片
    video_info = get_video_ids_from_playlist(playlist_id)
    
    # 分批處理影片
    batch_size = 10  # 每次處理10個影片
    for i in range(0, len(video_info), batch_size):
        batch_videos = video_info[i:i + batch_size]
        for video_id, video_date in batch_videos:
            # 檢查文件是否已存在
            file_name = video_date.strftime('%Y%m%d') + '.txt'
            file_path = os.path.join('timeline', file_name)
            if os.path.exists(file_path):
                print(f"日期為 {file_name} 的文件已存在，跳過視頻ID {video_id}。")
                continue

            print(f"處理視頻 {video_id} 來自 {video_date}")
            
            # 獲取時間戳留言
            timestamp_comment = get_timestamp_comment(video_id)
            
            # 保存到檔案
            if timestamp_comment:
                save_to_file(video_id, timestamp_comment, video_date)
        
        # 在每個批次之間加入延遲（例如2秒）
        time.sleep(2)

if __name__ == '__main__':
    main()
