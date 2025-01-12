import re

def parse_time(time_str):
    """將時間字符串轉換為秒數"""
    time_str = time_str.replace('：', ':')
    parts = list(map(int, time_str.split(':')))
    return parts[0] * 3600 + parts[1] * 60 + parts[2]

def create_link(video_id, time_str):
    """根據影片ID和時間創建超連結"""
    time_in_seconds = parse_time(time_str)
    return f"https://www.youtube.com/watch?v={video_id}&t={time_in_seconds}s"

def normalize_string(str):
    if not str:
        return ''
    str = str.lower()
    str = re.sub(r'\s+', '', str)
    return str

def process_timeline(file_path, date_str, member_exclusive_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist, copyright_songs):
    data = {}  # 改用字典來儲存資料
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        if not lines:
            print(f"Error: {file_path} is empty.")
            return []
        
        try:
            video_id = lines[0].strip().split('=')[1].strip()
        except IndexError:
            print(f"Error: Invalid video ID format in file {file_path}.")
            return []
        
        date = datetime.strptime(date_str, "%Y%m%d")
        old_rule_date = datetime.strptime("20240120", "%Y%m%d")
        new_rule_date = datetime.strptime("20240127", "%Y%m%d")
        
        for line in lines[1:]:
            try:
                if date <= old_rule_date:
                    # 舊規則解析
                    parts = line.strip().split(' | ', 3)
                    if len(parts) < 2:
                        print(f"Warning: Skipping line due to insufficient parts: '{line.strip()}'")
                        continue
                    time_str = parts[0]
                    song_name = parts[1]
                    artist = parts[2] if len(parts) > 2 else ''
                    source = parts[3] if len(parts) > 3 else ''
                elif date >= new_rule_date:
                    # 新規則解析
                    line = re.sub(r'^\d+.\s+', '', line)  # 移除行首的數字和點號
                    parts = line.strip().split('　', 1)
                    if len(parts) < 2:
                        print(f"Warning: Skipping line due to incorrect format: '{line.strip()}'")
                        continue
                        
                    time_str, second_part = parts
                    song_name = ""
                    artist = ""
                    source = ""
                    
                    # 檢查是否有『』，如果有則視為source
                    match = re.match(r'^(.*?)『(.*?)』(.*)$', second_part)
                    if match:
                        song_name = match.group(1).strip()
                        source = match.group(2).strip()
                        artist = match.group(3).strip()
                    else:
                        # 沒有『』，視為曲名 / 歌手
                        parts = second_part.split(' / ')
                        song_name = parts[0].strip()
                        artist = parts[1].strip() if len(parts) > 1 else ''
                
                # 建立唯一鍵（忽略大小寫和全半形）
                normalized_key = (normalize_string(song_name), normalize_string(artist))
                
                link = create_link(video_id, time_str)
                is_member_exclusive = date_str in member_exclusive_dates
                is_acapella = (
                    (date_str in acapella_songs and artist in acapella_songs[date_str] and song_name in acapella_songs[date_str][artist]) or
                    (song_name in global_acapella_songs) or
                    (artist in acapella_songs_with_artist and song_name in acapella_songs_with_artist[artist])
                )
                is_copyright = (song_name, artist) in copyright_songs or (song_name, None) in copyright_songs
                
                # 將資料存入字典
                if normalized_key not in data:
                    data[normalized_key] = {
                        'song_name': song_name,
                        'artist': artist,
                        'source': source,
                        'is_copyright': is_copyright,
                        'dates': []
                    }
                
                # 確保不重複添加日期資訊
                date_info = {
                    'date': date_str,
                    'time': time_str,
                    'link': link,
                    'is_member_exclusive': is_member_exclusive,
                    'is_acapella': is_acapella
                }
                if date_info not in data[normalized_key]['dates']:
                    data[normalized_key]['dates'].append(date_info)
                
            except Exception as e:
                print(f"Error processing line '{line.strip()}': {e}")
    
    # 轉換為列表格式
    return list(data.values())
