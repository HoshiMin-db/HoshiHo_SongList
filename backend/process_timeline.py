import os
import json
from datetime import datetime
import subprocess

def main():
    timeline_dir = 'timeline'
    all_data = []
    cutoff_date = datetime.strptime('20240120', '%Y%m%d')
    
    # 遍歷timeline資料夾中的所有文件
    for filename in os.listdir(timeline_dir):
        if filename.endswith('.txt'):
            file_path = os.path.join(timeline_dir, filename)
            date_str = filename.split('.')[0]  # 假設文件名是日期格式
            file_date = datetime.strptime(date_str, '%Y%m%d')
            
            # 根據日期選擇使用哪個腳本
            if file_date <= cutoff_date:
                # 使用 process_timeline_old.py
                result = subprocess.run(['python', 'backend/process_timeline_old.py', file_path], capture_output=True, text=True)
            else:
                # 使用 process_timeline_new.py
                result = subprocess.run(['python', 'backend/process_timeline_new.py', file_path], capture_output=True, text=True)
            
            if result.returncode == 0:
                # 檢查 result.stdout 是否為空
                if not result.stdout:
                    print(f"Error: No output received from the command for file {file_path}.")
                    continue
                
                # 打印 result.stdout 的內容
                print(f"Command output for {file_path}:", result.stdout)
                
                try:
                    data = json.loads(result.stdout)
                    for item in data:
                        item['date'] = date_str
                    all_data.extend(data)
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON for file {file_path}: {e}")
            else:
                print(f"Error processing file {file_path}: {result.stderr}")
    
    # 將數據保存到data.json文件中
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    main()
