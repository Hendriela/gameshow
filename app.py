import os
from flask import Flask, render_template, jsonify, send_from_directory
from questions import QUESTIONS_BY_MODE
import config as CFG

app = Flask(__name__)

@app.get("/")
def landing():
    return render_template("landing.html", app_title=CFG.APP["TITLE"])

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static', 'favicon'),
        'favicon.ico',
        mimetype='image/x-icon'
    )

@app.get("/sorting")
def sorting():
    # No configuration UI; we pass config values from code to the frontend.
    return render_template(
        "sorting.html",
        app_title=CFG.APP["TITLE"],
        team_a=CFG.SORTING["TEAM_A_NAME"],
        team_b=CFG.SORTING["TEAM_B_NAME"],
        target_wins=CFG.SORTING["TARGET_WINS"],
        turn_seconds=CFG.SORTING["TURN_SECONDS"],
    )

@app.get("/api/questions")
def api_questions():
    return jsonify({"by_mode": QUESTIONS_BY_MODE})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
