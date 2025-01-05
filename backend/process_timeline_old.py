import json
import os
from datetime import datetime

def parse_time(time_str):
    """將時間字符串轉換為秒數"""
    time_str = time_str.replace('：', ':')
    parts = list(map(int, time_str.split(':')))
    return parts[0] * 3600 + parts[1] * 60 + parts[2]

def create_link(video_id, time_str):
    """根據影片ID和時間創建超連結"""
    time_in_seconds = parse_time(time_str)
    return f"https://www.youtube.com/watch?v={video_id}&t={time_in_seconds}s"

def process_timeline(file_path):
    data = []
    
    # 驗證和清理文件路徑
    safe_file_path = os.path.join('timeline', os.path.basename(file_path))
    
    try:
        with open(safe_file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
            # 確保文件有內容
            if not lines:
                raise ValueError("文件內容為空")
            
            # 第一行是影片ID
            video_id = lines[0].strip().split('=')[1].strip()
            
            # 解析每行時間軸信息
            for line in lines[1:]:
                parts = line.strip().split(' | ')
                if len(parts) == 4:
                    time_str, song_name, artist, source = parts
                    link = create_link(video_id, time_str)
                    data.append({
                        'time': time_str,
                        'song_name': song_name,
                        'artist': artist,
                        'source': source,
                        'link': link
                    })
    except FileNotFoundError:
        print(f"文件未找到: {safe_file_path}")
    except Exception as e:
        print(f"處理文件時發生錯誤: {e}")
    
    return data
