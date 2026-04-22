#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

REQUIRED_ENV_VARS = [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'PERPLEXITY_API_KEY',
]

STATE_FILES = [
    'tasks.json',
    'api_usage.json',
]


def check_state_file(path: Path) -> list[str]:
    errors: list[str] = []
    if not path.exists():
        print(f'[preflight] optional state file missing: {path.name} (runtime can create it if needed)')
        return errors

    try:
        raw = path.read_text(encoding='utf-8')
        json.loads(raw or 'null')
    except Exception as exc:  # noqa: BLE001
        errors.append(f'unreadable state file: {path.name} ({exc})')

    return errors


def check_callback_reachability() -> list[str]:
    callback_base = os.getenv('PUBLIC_BASE_URL') or os.getenv('SERVICE_URL') or os.getenv('CALLBACK_BASE_URL')
    if not callback_base:
        return []

    callback_url = callback_base.rstrip('/') + '/callback'
    request = urllib.request.Request(callback_url, method='GET')
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            status = getattr(response, 'status', response.getcode())
            if status >= 400:
                return [f'callback endpoint returned HTTP {status}: {callback_url}']
    except urllib.error.HTTPError as exc:
        # 405 means the endpoint is reachable but only allows POST; anything else is a problem.
        if exc.code == 405:
            return []
        return [f'callback endpoint returned HTTP {exc.code}: {callback_url}']
    except Exception as exc:  # noqa: BLE001
        return [f'callback endpoint unreachable: {callback_url} ({exc})']

    return []


def main() -> int:
    parser = argparse.ArgumentParser(description='Fail-fast startup preflight for haodai-linebot')
    parser.add_argument('--strict', action='store_true', help='Exit non-zero on any issue')
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    errors: list[str] = []

    for name in REQUIRED_ENV_VARS:
        if not os.getenv(name):
            errors.append(f'missing required environment variable: {name}')

    for rel_path in STATE_FILES:
        errors.extend(check_state_file(root / rel_path))

    errors.extend(check_callback_reachability())

    if errors:
        for error in errors:
            print(f'[preflight] {error}', file=sys.stderr)
        return 1 if args.strict else 0

    print('[preflight] startup preflight passed')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
