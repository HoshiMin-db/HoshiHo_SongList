# backend/app.py

import gspread
from oauth2client.service_account import ServiceAccountCredentials
from flask import Flask, jsonify
import sqlite3

app = Flask(__name__)

def get_google_sheets_data():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name('你的憑證檔案.json', scope)
    client = gspread.authorize(creds)
    sheet = client.open('你的Google Sheets名稱').sheet1
    data = sheet.get_all_values()
    return data

def update_database(data):
    conn = sqlite3.connect('mydatabase.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS Comments (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 timestamp TEXT,
                 comment TEXT,
                 tag TEXT)''')

    for row in data[1:]:  # 跳過表頭
        timestamp, comment, tag = row[:3]  # 假設前3列為時間戳、留言、標籤
        c.execute('INSERT INTO Comments (timestamp, comment, tag) VALUES (?, ?, ?)', (timestamp, comment, tag))
        
# 根據顏色分類並插入資料
    for i, row in enumerate(data[1:], start=2): # 跳過表頭 
        timestamp, comment = row[:2] 
        color = sheet.cell(i, 2).format['backgroundColor'] 
        tag = 'Red' if color == {'red': 1, 'green': 0, 'blue': 0} else 'Other' # 根據顏色來分類 
        c.execute('INSERT INTO Comments (timestamp, comment, tag) VALUES (?, ?, ?)', (timestamp, comment, tag))
    
    conn.commit()
    conn.close()

@app.route('/update_db', methods=['POST'])
def update_db():
    data = get_google_sheets_data()
    update_database(data)
    return jsonify({"message": "Database updated successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True)
