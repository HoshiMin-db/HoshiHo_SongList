# 我的專案
  這是一個更新。v9.0  
  寫得好爛嗚哇啊啊啊啊啊破防惹
  加入了tag(不保證準確性)

# 邏輯
  ## /backend  
  `check_deleted_videos.py`  檢查刪檔  
  `disc_generation.py`  生成專輯資料  
  `getcomment.py`  抓取Youtube時間軸留言  
  `process_timeline.py`  抓取`timeline/yyyymmdd.txt`寫入`data.json`  
  `process_timeline.old.py`  正常運行備份  
  `update_tags_from_data.py`  檢查未加tag歌曲  
  ## /disc
  `disc.json`  專輯資料  
  `disc.txt`  專輯連結供抓取資料
  ## /js
  `core.js`  網頁邊欄、頁面翻譯  
  `disc_generation.js`  專輯卡片生成  
  `form-generation.js`  歌單生成  
  `form-generation.old.js`  正常運行備份  
  `romaji.js`  日文轉換  
  `search-bar.js`  搜尋欄、tags欄  
  `translations.txt`  頁面翻譯對照表
  `youtube-player.js`  Html播放器  
  ## /timeline
  `YYYYMMDD.txt`  當天歌單（人手抓蟲保持格式）  
  `acapella.txt`  清唱曲目，格式`曲名|(歌手)|(日期YYYYMMDD)`  
  `exceptions.txt`  會限、刪檔、版權炮歌曲，格式`屬性|日期YYYYMMDD`、`copyright|曲名|(歌手)`、`private_id|自動抓取影片ID寫入`  
  `headers.txt`  曲名首字假名清單（人手輸入），格式`假名|對應單字,'指定曲名'`  
  `tags.txt`  歌曲tags（能工智人輸入）  

# 鳴謝
  時間軸：Avery、アスパラ、霜月ルーニァ  
  程式碼：Claude、GPT、Gemini  
