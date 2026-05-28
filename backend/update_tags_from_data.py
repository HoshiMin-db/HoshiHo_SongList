import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data.json"
TAGS_PATH = ROOT / "timeline" / "tags.txt"

if not DATA_PATH.exists():
    raise FileNotFoundError(f"Missing {DATA_PATH}")
if not TAGS_PATH.exists():
    raise FileNotFoundError(f"Missing {TAGS_PATH}")

# 引入與 process_timeline.py 相同的正規化邏輯
def normalize_key(text):
    if not text:
        return ''
    # 1. 全半形統一
    normalized = unicodedata.normalize('NFKC', text)
    # 2. 波浪符號統一為 ~
    normalized = re.sub(r'[〜\u301c\u223c]', '~', normalized)
    # 3. 大小寫不敏感
    normalized = normalized.casefold()
    # 4. 去除前後空白，並將中間多個空白壓縮為單個空白
    normalized = re.sub(r"\s+", ' ', normalized)
    return normalized.strip()

with DATA_PATH.open("r", encoding="utf-8") as f:
    data = json.load(f)

existing_entries = {}
existing_lines = []
for line in TAGS_PATH.read_text(encoding="utf-8").splitlines():
    raw = line.strip()
    if not raw or raw.startswith("#"):
        continue
    parts = raw.split("|")
    if len(parts) < 2:
        continue
    
    # 使用 normalize 後的 (歌名, 歌手) 作為唯一的 Key 
    norm_key = (normalize_key(parts[0]), normalize_key(parts[1]))
    existing_entries.setdefault(norm_key, []).append(raw)
    existing_lines.append(raw)

duplicates = {k: v for k, v in existing_entries.items() if len(v) > 1}
if duplicates:
    print("⚠️ Detected duplicate tags.txt entries for the same song|artist key:")
    for norm_key, lines in duplicates.items():
        # 顯示時轉換為好看的格式
        print(f"  {norm_key[0]} | {norm_key[1]} ({len(lines)} entries)")
    print("These duplicates may cause unexpected behavior if the same song|artist appears multiple times.")
    print()

missing_lines = []
for song in data:
    song_name = song.get('song_name', '')
    artist = song.get('artist', '')
    
    # 用相同的正規化邏輯去比對
    norm_key = (normalize_key(song_name), normalize_key(artist))
    
    if norm_key not in existing_entries:
        missing_lines.append(f"{song_name}|{artist}|")

if missing_lines:
    content = TAGS_PATH.read_text(encoding="utf-8")
    if not content.endswith("\n"):
        content += "\n"
    content += "\n".join(missing_lines).rstrip() + "\n"
    TAGS_PATH.write_text(content, encoding="utf-8")
    print(f"Appended {len(missing_lines)} new tag lines to {TAGS_PATH}")
else:
    print("No new song entries found in data.json. timeline/tags.txt unchanged.")