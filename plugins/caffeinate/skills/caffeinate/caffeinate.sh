#!/bin/bash
# Use CLAUDE_PROJECT_DIR (hook env var) if available, fall back to PWD
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
PROJECT_HASH=$(echo -n "$PROJECT_DIR" | md5 -q)
PID_FILE="/tmp/caffeinate-${PROJECT_HASH}.pid"

case "${1:-start}" in
  start)
    EXISTING_PID=$(cat "$PID_FILE" 2>/dev/null)
    if [[ "$EXISTING_PID" =~ ^[0-9]+$ ]] && kill -0 "$EXISTING_PID" 2>/dev/null; then
      echo "caffeinate is already running (PID: $EXISTING_PID)"
      exit 0
    fi
    caffeinate -is &
    disown
    echo $! > "$PID_FILE"
    echo "caffeinate started (PID: $!)"
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE" 2>/dev/null)
      if [[ "$PID" =~ ^[0-9]+$ ]] && kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "caffeinate stopped (PID: $PID)"
      else
        echo "caffeinate process (PID: $PID) was not running"
      fi
      rm -f "$PID_FILE"
    else
      echo "No active caffeinate session found"
    fi
    ;;
  status)
    STATUS_PID=$(cat "$PID_FILE" 2>/dev/null)
    if [[ "$STATUS_PID" =~ ^[0-9]+$ ]] && kill -0 "$STATUS_PID" 2>/dev/null; then
      echo "caffeinate is running (PID: $STATUS_PID)"
    else
      [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
      echo "caffeinate is not running"
    fi
    ;;
  *)
    echo "Usage: caffeinate.sh {start|stop|status}" >&2
    exit 1
    ;;
esac
