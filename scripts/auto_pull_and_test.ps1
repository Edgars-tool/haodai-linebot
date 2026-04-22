param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
Set-Location $RepoRoot

Write-Host '[auto-pull] syncing main branch'
git fetch origin main
git checkout -B main origin/main
git pull --ff-only origin main

Write-Host '[auto-pull] installing dependencies'
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

Write-Host '[auto-pull] running preflight'
python scripts/preflight_check.py --strict

Write-Host '[auto-pull] compiling startup modules'
python -m py_compile app.py main.py scripts/preflight_check.py

Write-Host '[auto-pull] completed successfully'
