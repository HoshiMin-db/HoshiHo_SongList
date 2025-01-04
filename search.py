from flask import Flask, render_template, request, jsonify
import json

app = Flask(__name__)

# 加載數據
with open('data.json', 'r', encoding='utf-8') as f:
    all_data = json.load(f)

@app.route('/')
def index():
    return render_template('main/index.html', song_count=len(all_data))

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query', '').lower()
    filtered_data = [row for row in all_data if query in row['song_name'].lower() or query in row['artist'].lower() or query in row['source'].lower()]
    
    # 將數據分組並排序
    grouped_data = {}
    for row in filtered_data:
        key = f"{row['song_name']}-{row['artist']}"
        if key not in grouped_data:
            grouped_data[key] = []
        grouped_data[key].append(row)

    for group in grouped_data.values():
        group.sort(key=lambda x: x['date'], reverse=True)

    return jsonify(grouped_data)

if __name__ == '__main__':
    app.run(debug=True)
