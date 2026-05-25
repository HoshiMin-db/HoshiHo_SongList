import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data.json"
TAGS_PATH = ROOT / "timeline" / "tags.txt"

if not DATA_PATH.exists():
    raise FileNotFoundError(f"Missing {DATA_PATH}")
if not TAGS_PATH.exists():
    raise FileNotFoundError(f"Missing {TAGS_PATH}")

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
    key = f"{parts[0]}|{parts[1]}"
    existing_entries.setdefault(key, []).append(raw)
    existing_lines.append(raw)

duplicates = {k: v for k, v in existing_entries.items() if len(v) > 1}
if duplicates:
    print("⚠️ Detected duplicate tags.txt entries for the same song|artist key:")
    for key, lines in duplicates.items():
        print(f"  {key} ({len(lines)} entries)")
    print("These duplicates may cause unexpected behavior if the same song|artist appears multiple times.")
    print()

missing_lines = []
for song in data:
    key = f"{song.get('song_name','')}|{song.get('artist','')}"
    if key not in existing_entries:
        missing_lines.append(f"{song.get('song_name','')}|{song.get('artist','')}|")

if missing_lines:
    content = TAGS_PATH.read_text(encoding="utf-8")
    if not content.endswith("\n"):
        content += "\n"
    content += "\n".join(missing_lines).rstrip() + "\n"
    TAGS_PATH.write_text(content, encoding="utf-8")
    print(f"✅ Appended {len(missing_lines)} new tag lines to {TAGS_PATH}")
else:
    print("✅ No new song entries found in data.json. timeline/tags.txt unchanged.")
