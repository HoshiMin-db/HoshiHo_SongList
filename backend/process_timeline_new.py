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
            # 根據新的格式解析
            line = line.strip()
            if not line:
                continue
            
            parts = line.split('　')
            if len(parts) < 2:
                continue
            
            # 忽略編號，提取時間和曲名/歌手/出處
            time_str, rest = parts[1].split('　', 1)
            song_parts = rest.split(' / ')
            
            song_name = song_parts[0].strip()
            source = ''
            artist = ''
            
            if len(song_parts) == 2:
                artist_parts = song_parts[1].split('』')
                if len(artist_parts) == 2:
                    source = artist_parts[0].replace('『', '').strip()
                    artist = artist_parts[1].strip()
                else:
                    artist = song_parts[1].strip()
            
            link = create_link(video_id, time_str)
            data.append({
                'time': time_str,
                'song_name': song_name,
                'artist': artist,
                'source': source,
                'link': link
            })
    
    return data
