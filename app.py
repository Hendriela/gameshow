from flask import Flask, render_template, jsonify
from questions import QUESTIONS

app = Flask(__name__)

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/questions")
def api_questions():
    # Send only what the client needs
    return jsonify({
        "questions": QUESTIONS
    })

if __name__ == "__main__":
    # Use debug=True while iterating; set False for “game night”
    app.run(host="127.0.0.1", port=5000, debug=True)
