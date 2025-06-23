#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "ipetrash"


from datetime import timedelta

from flask import Flask, render_template, jsonify, session, request

# pip install Flask-HTTPAuth
from flask_httpauth import HTTPBasicAuth

from werkzeug.security import generate_password_hash, check_password_hash

from config import SECRET_KEY, users
from third_party.mini_played_games_parser import get_played_games


app = Flask(__name__)
app.json.sort_keys = False
app.permanent_session_lifetime = timedelta(days=365)
app.secret_key = SECRET_KEY

auth = HTTPBasicAuth()


USERS = {
    login: generate_password_hash(password)
    for login, password in users.items()
}


@auth.verify_password
def verify_password(username: str, password: str) -> str | bool | None:
    # Не проверять для 127.0.0.1
    if request.remote_addr == "127.0.0.1":
        return True

    # Запрос без авторизации, попробуем проверить куки
    if not username or not password:
        username = session.get("x-auth-username")
        password = session.get("x-auth-password")

    # Если проверка успешна, то сохраним логин/пароль, чтобы можно было авторизоваться из куков
    # Сессии зашифрованы секретным ключом, поэтому можно хранить как есть
    if username in USERS and check_password_hash(USERS.get(username), password):
        session["x-auth-username"] = username
        session["x-auth-password"] = password
        session.permanent = True

        return username


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
