#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "ipetrash"


from flask import Flask, render_template, jsonify

# pip install Flask-HTTPAuth
from flask_httpauth import HTTPDigestAuth

from config import SECRET_KEY, users
from third_party.mini_played_games_parser import get_played_games


app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False
app.config["SECRET_KEY"] = SECRET_KEY

auth = HTTPDigestAuth()


@auth.get_password
def get_password(username: str) -> str | None:
    return users.get(username)


@app.route("/")
@auth.login_required
def index():
    return render_template("index.html", title="Парсер игр")


@app.route("/get_played_games")
def played_games():
    return jsonify(get_played_games())


if __name__ == "__main__":
    host = "0.0.0.0"
    port = 10008
    print(
        f"HTTP server running on http://{'127.0.0.1' if host == '0.0.0.0' else host}:{port}"
    )

    app.run(host=host, port=port)
