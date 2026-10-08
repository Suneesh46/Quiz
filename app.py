from flask import Flask, request, jsonify
import sqlite3
import os

if __name__ == '__main__':
    # Render provides a dynamic PORT environment variable; default to 5000 locally
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)


# Tell Flask to safely serve HTML and JS files from the current directory
app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

# --- Initialize SQLite Database ---

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect('quiz.db')
    cursor = conn.cursor()
    
    # Create Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    
    # Create Scores Table linked to Users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            score INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    conn.commit()
    conn.close()

# 1. Register Account Endpoint
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    try:
        conn = sqlite3.connect('quiz.db')
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, password))
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Account created!", "user_id": user_id, "username": username}), 201
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "Username already exists. Please login."}), 400

# 2. Login Endpoint
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    conn = sqlite3.connect('quiz.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, username FROM users WHERE username = ? AND password = ?', (username, password))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return jsonify({"success": True, "message": "Login successful", "user_id": user[0], "username": user[1]}), 200
    else:
        return jsonify({"success": False, "message": "Invalid username or password"}), 401

# 3. Store Score Endpoint
@app.route('/api/score', methods=['POST'])
def submit_score():
    data = request.get_json()
    conn = sqlite3.connect('quiz.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO scores (user_id, subject, score) VALUES (?, ?, ?)', 
                  (data.get('user_id'), data.get('subject'), data.get('score')))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Score saved successfully"}), 201

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
