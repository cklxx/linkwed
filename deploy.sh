#!/usr/bin/env bash
set -euo pipefail

APP_NAME="linkwed"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_DOCKER_PORT=80
DEFAULT_PREVIEW_PORT=4173

PORT="${PORT:-}"

cd "$PROJECT_ROOT"

echo "➡️  Starting LinkWed deployment..."

if command -v docker >/dev/null 2>&1; then
  PORT="${PORT:-$DEFAULT_DOCKER_PORT}"
  echo "🐳 Docker detected. Building production image..."
  docker build -t "$APP_NAME" .

  if docker ps -a --format '{{.Names}}' | grep -Eq "^${APP_NAME}$"; then
    echo "♻️  Removing existing container $APP_NAME"
    docker rm -f "$APP_NAME" >/dev/null 2>&1 || true
  fi

  echo "🚀 Launching container on port $PORT"
  docker run -d --name "$APP_NAME" -p "${PORT}:80" "$APP_NAME"
  echo "✅ Deployment complete! Visit http://localhost:${PORT}"
else
  PORT="${PORT:-$DEFAULT_PREVIEW_PORT}"
  echo "ℹ️  Docker not available — falling back to local preview server."
  echo "📦 Installing dependencies..."
  npm install
  echo "🏗️ Building production bundle..."
  npm run build
  echo "🎧 Serving on http://0.0.0.0:${PORT} (press Ctrl+C to stop)"
  npm run preview -- --host 0.0.0.0 --port "${PORT}"
fi
