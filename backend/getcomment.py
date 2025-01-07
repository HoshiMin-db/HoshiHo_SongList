import os
import json
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime, timedelta

# 從環境變量中讀取 Google API 憑證
google_sheets_credentials = os.getenv('GOOGLE_SHEETS_CREDENTIALS')
google_api_key = os.getenv('GOOGLE_API_KEY')

if not google_sheets_credentials or not google_api_key:
    raise ValueError("Missing Google API credentials or API key")

try:
    credentials_info = json.loads(google_sheets_credentials)
    credentials = service_account.Credentials.from_service_account_info(credentials_info)
except Exception as e:
    raise ValueError("Invalid Google Sheets credentials") from e

# YouTube Data API 客戶端
youtube = build('youtube', 'v3', developerKey=google_api_key)

# 快取儲存影片日期
video_date_cache = {}

def get_video_date(video_id):
    """獲取影片的實際直播日期"""
    if video_id in video_date_cache:
        return video_date_cache[video_id]
    
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
        print(f"Skipping members-only video: {video_id}")
        return None
    
    # 檢查是否為直播影片
    if 'liveStreamingDetails' in video_details:
        # 使用直播開始時間
        actual_start_time = video_details['liveStreamingDetails'].get('actualStartTime')
        if actual_start_time:
            # 直接解析時間，這已經是當地時間
            stream_date = datetime.strptime(actual_start_time, '%Y-%m-%dT%H:%M:%SZ')
            video_date_cache[video_id] = stream_date.date()
            return stream_date.date()
    
    # 如果不是直播或沒有直播時間，使用發布時間
    publish_time = video_details['snippet']['publishedAt']
    publish_date = datetime.strptime(publish_time, '%Y-%m-%dT%H:%M:%SZ')
    video_date_cache[video_id] = publish_date.date()
    return publish_date.date()

def get_video_ids_from_playlist(playlist_id, last_request_time=None):
    """從播放清單獲取影片ID和日期"""
    video_info = []
    request = youtube.playlistItems().list(
        part='contentDetails',
        playlistId=playlist_id,
        maxResults=50
    )
    
    while request:
        response = request.execute()
        for item in response['items']:
            video_id = item['contentDetails']['videoId']
            video_date = get_video_date(video_id)
            
            if video_date and (not last_request_time or video_date > last_request_time):
                video_info.append((video_id, video_date))
                print(f"Found video: {video_id} from {video_date}")
                
        request = youtube.playlistItems().list_next(request, response)
    
    return video_info

def get_timestamp_comment(video_id):
    """獲取包含時間戳標記的留言"""
    request = youtube.commentThreads().list(
        part='snippet',
        videoId=video_id,
        maxResults=100
    )
    
    while request:
        response = request.execute()
        for item in response['items']:
            comment = item['snippet']['topLevelComment']['snippet']['textDisplay']
            if '💐🌟🎶タイムスタンプ💐🌟🎶' in comment:
                return comment
                
        request = youtube.commentThreads().list_next(request, response)
    
    return None

def save_to_file(video_id, comment, date):
    """保存留言到文件"""
    if not comment:
        print(f"No timestamp comment found for video {video_id}")
        return
        
    output_dir = 'timeline'
    os.makedirs(output_dir, exist_ok=True)
    
    file_name = date.strftime('%Y%m%d') + '.txt'
    file_path = os.path.join(output_dir, file_name)
    
    # 檢查文件是否已存在
    if os.path.exists(file_path):
        print(f"File for date {file_name} already exists, skipping.")
        return
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(f'ID = {video_id}\n')
        f.write(comment)
        
    print(f"Saved timestamp comment to {file_path}")

def main():
    playlist_id = 'PL7H5HbMMfm_lUoLIkPAZkhF_W0oDf5WEk'
    last_request_time = datetime.now() - timedelta(days=1)  # 假設我們只請求過去一天新增的影片
    
    # 獲取播放清單中的所有影片
    video_info = get_video_ids_from_playlist(playlist_id, last_request_time)
    
    for video_id, video_date in video_info:
        # 檢查文件是否已存在
        file_name = video_date.strftime('%Y%m%d') + '.txt'
        file_path = os.path.join('timeline', file_name)
        if os.path.exists(file_path):
            print(f"File for date {file_name} already exists, skipping video ID {video_id}.")
            continue

        print(f"Processing video {video_id} from {video_date}")
        
        # 獲取時間戳留言
        timestamp_comment = get_timestamp_comment(video_id)
        
        # 保存到檔案
        if timestamp_comment:
            save_to_file(video_id, timestamp_comment, video_date)

if __name__ == '__main__':
    main()
