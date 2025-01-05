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
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    # 第一行是影片ID
    video_id = lines[0].strip().split('=')[1].strip()
    
    # 解析每行時間軸信息
    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
            
        # 先分割時間和其他內容
        parts = line.split('　', 2)  # 最多分割2次，保留最後一個部分完整
        if len(parts) < 2:
            continue
            
        time_str = parts[1]
        rest = parts[-1]
        
        # 處理歌曲信息
        song_parts = rest.split(' / ')
        song_name = song_parts[0].strip()
        
        # 初始化歌手和出處
        artist = ''
        source = ''
        
        # 如果有歌手/出處信息
        if len(song_parts) > 1:
            info = song_parts[1].strip()
            # 檢查是否有出處
            if '『' in info:
                # 有出處的情況
                source_parts = info.split('』')
                source = source_parts[0].replace('『', '').strip()
                if len(source_parts) > 1:
                    artist = source_parts[1].strip()
            else:
                # 只有歌手沒有出處
                artist = info
        
        link = create_link(video_id, time_str)
        
        data.append({
            'time': time_str,
            'song_name': song_name,
            'artist': artist,
            'source': source,
            'link': link
        })
    
    return data
