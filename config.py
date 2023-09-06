#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "ipetrash"


import json
import os

from pathlib import Path


DIR = Path(__file__).resolve().parent

SECRET_KEY_FILE_NAME = DIR / "SECRET_KEY.txt"
SECRET_KEY = (
    os.environ.get("SECRET_KEY")
    or SECRET_KEY_FILE_NAME.read_text("utf-8").strip()
)
if not SECRET_KEY:
    raise Exception("SECRET_KEY must be set in the SECRET_KEY.txt file or in an environment variable")

PATH_USERS = DIR / 'users.json'

# Example:
# {
#     "<LOGIN>": "<PASSWORD>"
# }
users = json.loads(PATH_USERS.read_text('utf-8'))
