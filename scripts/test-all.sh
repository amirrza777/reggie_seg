#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_package() {
  local label="$1"
  local path="$2"
  shift 2
  echo "\n==> ${label} tests"
  npm --prefix "${path}" test -- "$@"
}

run_package "API" "${ROOT}/apps/api" "$@"
run_package "Web" "${ROOT}/apps/web" "$@"
run_package "Shared" "${ROOT}/packages/shared" "$@"

echo "\n✅ All package test runs completed"
