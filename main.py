#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = 'ipetrash'


from flask import Flask, render_template


app = Flask(__name__)


@app.route("/")
def index():
    return render_template(
        "index.html",
        title='Парсер игр'
    )


if __name__ == '__main__':
    host = '0.0.0.0'
    port = 10008
    print(f"HTTP server running on http://{'127.0.0.1' if host == '0.0.0.0' else host}:{port}")

    app.run(host=host, port=port)
