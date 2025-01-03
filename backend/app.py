from flask import Flask, jsonify, send_from_directory
from getsheet import get_sheet_data
import os

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory(os.getcwd(), 'index.html')

@app.route('/data')
def data():
    sheet_data = get_sheet_data()
    return jsonify(sheet_data)

if __name__ == '__main__':
    app.run(debug=True)
