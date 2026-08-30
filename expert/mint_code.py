"""Mint one WebRTC code. Prints JSON {code} or {error}."""

from __future__ import annotations

import json
import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from envutil import load_repo_env

load_repo_env()


def main() -> int:
    try:
        from guava import Client
    except ImportError:
        print(json.dumps({"error": "guava-sdk not installed"}))
        return 1
    try:
        client = Client()
        code = client.create_webrtc_agent(ttl=timedelta(hours=12))
        print(json.dumps({"code": str(code)}))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
