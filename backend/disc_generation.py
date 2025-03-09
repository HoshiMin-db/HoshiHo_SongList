import json
import hashlib

DISC_FILE_PATH = './timeline/disc.txt'
CACHE_FILE_PATH = 'disc.json'

def parse_disc_file():
    discography = {
        "armony": {"name": "Armony", "description": "音樂企劃Armony的作品", "albums": []},
        "other_circles": {"name": "Other Circles", "description": "參與其他社團的作品", "albums": []},
        "solo": {"name": "Solo Works", "description": "個人作品", "albums": []}
    }

    current_category = None
    with open(DISC_FILE_PATH, 'r', encoding='utf-8') as file:
        for line in file:
            trimmed_line = line.strip()
            if not trimmed_line:
                continue

            if trimmed_line.startswith('[') and trimmed_line.endswith(']'):
                category_name = trimmed_line[1:-1]
                if category_name == 'Armony':
                    current_category = 'armony'
                elif category_name == 'Other Circles':
                    current_category = 'other_circles'
                elif category_name == 'Solo Works':
                    current_category = 'solo'
                continue

            if current_category:
                title, type_, release_date, yt_url, linkcore = (trimmed_line.split('|') + [None] * 5)[:5]
                album = {
                    "title": title.strip(),
                    "type": type_.strip(),
                    "releaseDate": release_date.strip(),
                    "ytUrl": yt_url.strip(),
                    "linkcore": linkcore.strip() if linkcore else None,
                    "tracks": []  # 可以在這裡添加 YouTube API 數據
                }
                discography[current_category]["albums"].append(album)

    return discography

def save_to_json(data, file_path):
    with open(file_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    discography = parse_disc_file()
    save_to_json(discography, CACHE_FILE_PATH)
