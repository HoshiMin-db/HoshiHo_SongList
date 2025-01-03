from flask import Flask, jsonify, render_template
from getsheet import get_sheet_data

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data')
def data():
    sheet_data = get_sheet_data()
    return jsonify(sheet_data)

if __name__ == '__main__':
    app.run(debug=True)
