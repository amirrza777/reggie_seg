#!/usr/bin/env bash
set -u

usage() {
  cat <<'EOF'
Usage:
  bash scripts/scan-functions.sh [--mine] [--heavy [0.0-1.0]] [--threshold 0.0-1.0] [--author-email EMAIL] [--author-name NAME]

Modes:
  Default (no flag): scan all non-test TS/TSX source files in apps/api and apps/web.
  --mine:            scan files where you authored at least one commit touching the file.
  --heavy [T]:       scan files where your commit share for the file is >= threshold T (default 0.50).
                     You can also set threshold via --threshold.

Author identity:
  Defaults to git config user.email/user.name unless overridden.
EOF
}

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root" || exit 1

ownership_mode="${OWNERSHIP_MODE:-all}"
ownership_threshold="${OWNERSHIP_THRESHOLD:-0.50}"
author_email="${AUTHOR_EMAIL:-$(git config user.email 2>/dev/null || true)}"
author_name="${AUTHOR_NAME:-$(git config user.name 2>/dev/null || true)}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mine)
      ownership_mode="mine"
      ;;
    --heavy)
      ownership_mode="heavy"
      if [[ $# -gt 1 && "${2:-}" != --* ]]; then
        ownership_threshold="$2"
        shift
      fi
      ;;
    --threshold)
      ownership_threshold="${2:-}"
      shift
      ;;
    --author-email)
      author_email="${2:-}"
      shift
      ;;
    --author-name)
      author_name="${2:-}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[scan:functions] Unknown option: $1"
      usage
      exit 2
      ;;
  esac
  shift
done

if [[ "$ownership_mode" == "mine" || "$ownership_mode" == "heavy" ]]; then
  if [[ -z "$author_email" && -z "$author_name" ]]; then
    echo "[scan:functions] Cannot resolve author identity. Set git user.name/user.email or pass --author-email/--author-name."
    exit 2
  fi
fi

if [[ "$ownership_mode" == "heavy" ]]; then
  if ! awk -v t="$ownership_threshold" 'BEGIN { exit !(t ~ /^([0-9]*[.])?[0-9]+$/ && t+0 >= 0 && t+0 <= 1) }'; then
    echo "[scan:functions] Invalid threshold: $ownership_threshold (expected 0.0 to 1.0)"
    exit 2
  fi
fi

collect_source_files() {
  local app="$1"
  git ls-files "$app/src" \
    | rg '\.tsx?$' \
    | rg -v '(\.test\.|\.spec\.|/__tests__/|\.test-helpers\.)'
}

ownership_ratio_for_file() {
  local file="$1"
  git log --format='%ae%x09%an' -- "$file" 2>/dev/null | awk -F '\t' \
    -v target_email="$(printf '%s' "$author_email" | tr '[:upper:]' '[:lower:]')" \
    -v target_name="$(printf '%s' "$author_name" | tr '[:upper:]' '[:lower:]')" '
      BEGIN { total=0; mine=0 }
      NF >= 1 && $1 != "" {
        total++
        mail=tolower($1)
        author=(NF >= 2 ? tolower($2) : "")
        is_mine=0
        if (target_email != "" && mail == target_email) {
          is_mine=1
        } else if (target_name != "" && author == target_name) {
          is_mine=1
        }
        if (is_mine) {
          mine++
        }
      }
      END {
        if (total == 0) {
          print 0
        } else {
          print mine / total
        }
      }
    '
}

scan_app() {
  local app="$1"
  local app_status=0
  local mode_summary=""
  local -a source_files=()
  local -a selected_files=()
  local -a relative_files=()
  local ratio

  while IFS= read -r file; do
    source_files+=("$file")
  done < <(collect_source_files "$app")

  if [[ "$ownership_mode" == "all" ]]; then
    selected_files=("${source_files[@]}")
    mode_summary="all files"
  else
    for file in "${source_files[@]}"; do
      ratio="$(ownership_ratio_for_file "$file")"
      if [[ "$ownership_mode" == "mine" ]]; then
        if awk -v r="$ratio" 'BEGIN { exit !(r > 0) }'; then
          selected_files+=("$file")
        fi
      else
        if awk -v r="$ratio" -v t="$ownership_threshold" 'BEGIN { exit !(r >= t) }'; then
          selected_files+=("$file")
        fi
      fi
    done
    if [[ "$ownership_mode" == "mine" ]]; then
      mode_summary="files with commit history by ${author_email:-$author_name}"
    else
      mode_summary="files with commit share >= ${ownership_threshold} by ${author_email:-$author_name}"
    fi
  fi

  echo "[scan:functions] $app: selected ${#selected_files[@]}/${#source_files[@]} (${mode_summary})"
  if [[ ${#selected_files[@]} -eq 0 ]]; then
    echo "[scan:functions] $app: no matching files, skipping."
    return 0
  fi

  for file in "${selected_files[@]}"; do
    relative_files+=("${file#${app}/}")
  done

  echo "[scan:functions] Running $app scan..."
  (
    cd "$repo_root/$app" || exit 1
    npx eslint --max-warnings 0 "${relative_files[@]}"
  ) || app_status=$?

  return "$app_status"
}

api_status=0
web_status=0

scan_app "apps/api" || api_status=$?
scan_app "apps/web" || web_status=$?

if [[ $api_status -eq 0 && $web_status -eq 0 ]]; then
  echo "[scan:functions] Passed in api and web."
  exit 0
fi

echo "[scan:functions] Failed. api_exit=$api_status web_exit=$web_status"
exit 1
