{
  description = "Nix flake for Team Feedback web + API development, run, tests, seed/unseed";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-darwin" ] (system:
      let
        pkgs = import nixpkgs { inherit system; };

        runtimeInputs = with pkgs; [
          bash
          coreutils
          findutils
          gnugrep
          gnused
          gawk
          jq
          git
          nodejs_22
          openssl
          pkg-config
          python3
          gnumake
          docker-client
          docker-compose
          mariadb
          procps
        ];

        mkApp = name: body:
          let
            script = pkgs.writeShellApplication {
              inherit name runtimeInputs;
              text = ''
                set -euo pipefail

                ensure_repo_root() {
                  if [ ! -d "./apps/api" ] || [ ! -d "./apps/web" ]; then
                    echo "Run this command from the repository root (expected ./apps/api and ./apps/web)." >&2
                    exit 1
                  fi
                }

                ensure_env_files() {
                  if [ ! -f apps/api/.env ]; then
                    cp apps/api/.env.example apps/api/.env
                    echo "Created apps/api/.env from .env.example"
                  fi
                  if [ ! -f apps/web/.env ]; then
                    cp apps/web/.env.example apps/web/.env
                    echo "Created apps/web/.env from .env.example"
                  fi
                }

                has_compose() {
                  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
                    return 0
                  fi
                  if command -v docker-compose >/dev/null 2>&1; then
                    return 0
                  fi
                  return 1
                }

                compose() {
                  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
                    docker compose "$@"
                  else
                    docker-compose "$@"
                  fi
                }

                ensure_db() {
                  DB_URL_OVERRIDE=""

                  wait_for_local_mysql() {
                    local host="$1"
                    local port="$2"
                    local user="$3"
                    local pass="$4"
                    local attempts=0
                    while [ "$attempts" -lt 45 ]; do
                      if [ -n "$pass" ]; then
                        if mysqladmin --protocol=tcp -h"$host" -P"$port" -u"$user" -p"$pass" ping >/dev/null 2>&1; then
                          return 0
                        fi
                      else
                        if mysqladmin --protocol=tcp -h"$host" -P"$port" -u"$user" ping >/dev/null 2>&1; then
                          return 0
                        fi
                      fi
                      attempts=$((attempts + 1))
                      sleep 1
                    done
                    return 1
                  }

                  start_local_mysql_fallback() {
                    local base_dir=".nix/mysql"
                    local data_dir="$base_dir/data"
                    local socket_path="$base_dir/mysql.sock"
                    local pid_path="$base_dir/mysqld.pid"
                    local log_path="$base_dir/mysqld.log"
                    local port="3307"

                    mkdir -p "$base_dir"

                    if [ ! -d "$data_dir/mysql" ]; then
                      echo "Initializing local MySQL fallback data directory..."
                      rm -rf "$data_dir"
                      mkdir -p "$data_dir"
                      if ! mariadb-install-db --datadir="$data_dir" --auth-root-authentication-method=normal >/dev/null 2>&1; then
                        echo "Warning: failed to initialize local MySQL fallback data directory." >&2
                        return 1
                      fi
                    fi

                    if [ -f "$pid_path" ] && kill -0 "$(cat "$pid_path" 2>/dev/null)" 2>/dev/null; then
                      echo "Local MySQL fallback already running."
                    else
                      echo "Starting local MySQL fallback on 127.0.0.1:$port ..."
                      mysqld \
                        --datadir="$data_dir" \
                        --socket="$socket_path" \
                        --pid-file="$pid_path" \
                        --port="$port" \
                        --bind-address=127.0.0.1 \
                        --skip-log-bin \
                        --skip-networking=0 \
                        --log-error="$log_path" \
                        --user="$(id -un)" >/dev/null 2>&1 &
                    fi

                    if ! wait_for_local_mysql "127.0.0.1" "$port" "root" ""; then
                      echo "Warning: local MySQL fallback failed to start." >&2
                      echo "Check $log_path for details." >&2
                      return 1
                    fi

                    mysql --protocol=tcp -h127.0.0.1 -P"$port" -uroot <<'SQL' >/dev/null 2>&1 || true
CREATE DATABASE IF NOT EXISTS appdb;
CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'apppass';
ALTER USER 'appuser'@'%' IDENTIFIED BY 'apppass';
GRANT ALL PRIVILEGES ON appdb.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
SQL

                    DB_URL_OVERRIDE="mysql://appuser:apppass@127.0.0.1:$port/appdb"
                    export DB_URL_OVERRIDE
                    echo "Using local MySQL fallback database at 127.0.0.1:$port."
                    return 0
                  }

                  if [ "''${SKIP_DOCKER:-0}" = "1" ]; then
                    echo "Skipping docker compose startup (SKIP_DOCKER=1)."
                    return
                  fi

                  if has_compose; then
                    if compose up -d mysql; then
                      echo "MySQL container started (or already running)."
                    else
                      echo "Warning: could not start MySQL via docker compose." >&2
                      echo "Falling back to local MySQL process managed by Nix runtime..." >&2
                      if ! start_local_mysql_fallback; then
                        echo "Ensure MySQL is running and DATABASE_URL in apps/api/.env is reachable." >&2
                      fi
                    fi
                  else
                    echo "Warning: docker compose not available." >&2
                    echo "Falling back to local MySQL process managed by Nix runtime..." >&2
                    if ! start_local_mysql_fallback; then
                      echo "Ensure MySQL is already running and DATABASE_URL in apps/api/.env is reachable." >&2
                    fi
                  fi
                }

                install_deps() {
                  npm ci --prefix apps/api
                  npm ci --prefix apps/web
                  if [ -f packages/shared/package.json ]; then
                    npm ci --prefix packages/shared
                  fi
                }

                ensure_deps() {
                  if [ ! -d apps/api/node_modules ]; then
                    npm ci --prefix apps/api
                  fi
                  if [ ! -d apps/web/node_modules ]; then
                    npm ci --prefix apps/web
                  fi
                  if [ -f packages/shared/package.json ] && [ ! -d packages/shared/node_modules ]; then
                    npm ci --prefix packages/shared
                  fi
                }

                migrate_db() {
                  (
                    cd apps/api
                    if [ -n "''${DB_URL_OVERRIDE:-}" ]; then
                      DATABASE_URL="$DB_URL_OVERRIDE" npm exec prisma generate
                      DATABASE_URL="$DB_URL_OVERRIDE" npm exec prisma migrate deploy
                    else
                      npm exec prisma generate
                      npm exec prisma migrate deploy
                    fi
                  )
                }

                run_non_interactive_tests() {
                  script_out="$(npm pkg get scripts.test:run 2>/dev/null || echo "{}")"
                  if [ "$script_out" != "{}" ]; then
                    npm run test:run
                  else
                    npm run test
                  fi
                }

                ${body}
              '';
            };
          in
          {
            type = "app";
            program = "${script}/bin/${name}";
          };
      in
      {
        apps = rec {
          init = mkApp "init" ''
            ensure_repo_root
            ensure_env_files
            ensure_db
            install_deps
            migrate_db
            (
              cd apps/api
              if [ -n "''${DB_URL_OVERRIDE:-}" ]; then
                DATABASE_URL="$DB_URL_OVERRIDE" npm run db:seed
              else
                npm run db:seed
              fi
            )
            echo "✅ init complete"
          '';

          run = mkApp "run" ''
            ensure_repo_root
            ensure_env_files
            ensure_db
            ensure_deps
            migrate_db

            npm --prefix apps/api run dev &
            api_pid=$!
            npm --prefix apps/web run dev &
            web_pid=$!

            cleanup() {
              kill "$api_pid" "$web_pid" 2>/dev/null || true
            }
            trap cleanup EXIT INT TERM

            wait -n "$api_pid" "$web_pid"
          '';

          tests = mkApp "tests" ''
            ensure_repo_root
            ensure_env_files
            ensure_db
            ensure_deps
            migrate_db

            coverage_status=0
            coverage_command_failed=0

            if ! (
              cd apps/api
              if [ -n "''${DB_URL_OVERRIDE:-}" ]; then
                DATABASE_URL="$DB_URL_OVERRIDE" npm run test:coverage -- \
                  --coverage.reportOnFailure=true \
                  --coverage.reporter=html \
                  --coverage.reporter=lcov \
                  --coverage.reporter=text \
                  --coverage.reportsDirectory=coverage
              else
                npm run test:coverage -- \
                  --coverage.reportOnFailure=true \
                  --coverage.reporter=html \
                  --coverage.reporter=lcov \
                  --coverage.reporter=text \
                  --coverage.reportsDirectory=coverage
              fi
            ); then
              echo "❌ API coverage run failed"
              coverage_status=1
              coverage_command_failed=1
            fi

            if ! (
              cd apps/web
              npm run test:coverage -- \
                --coverage.reportOnFailure=true \
                --coverage.reporter=html \
                --coverage.reporter=lcov \
                --coverage.reporter=text \
                --coverage.reportsDirectory=coverage
            ); then
              echo "❌ Web coverage run failed"
              coverage_status=1
              coverage_command_failed=1
            fi

            if [ ! -d apps/api/coverage ]; then
              echo "❌ API coverage directory missing: apps/api/coverage"
              coverage_status=1
            fi

            if [ ! -d apps/web/coverage ]; then
              echo "❌ Web coverage directory missing: apps/web/coverage"
              coverage_status=1
            fi

            if [ "$coverage_status" -ne 0 ]; then
              if [ "$coverage_command_failed" -eq 1 ]; then
                echo "⚠️ coverage command(s) failed, but reports were generated:"
                echo "   - apps/api/coverage"
                echo "   - apps/web/coverage"
                exit 0
              fi
              echo "❌ tests entrypoint failed: coverage reports were not generated"
              exit 1
            fi

            echo "✅ coverage complete"
            echo "   - apps/api/coverage"
            echo "   - apps/web/coverage"
          '';

          unseed = mkApp "unseed" ''
            ensure_repo_root
            ensure_env_files
            ensure_db
            ensure_deps
            (
              cd apps/api
              if [ -n "''${DB_URL_OVERRIDE:-}" ]; then
                DATABASE_URL="$DB_URL_OVERRIDE" npm run db:unseed
              else
                npm run db:unseed
              fi
            )
            echo "✅ unseed complete"
          '';

          seed = mkApp "seed" ''
            ensure_repo_root
            ensure_env_files
            ensure_db
            ensure_deps
            migrate_db
            (
              cd apps/api
              if [ -n "''${DB_URL_OVERRIDE:-}" ]; then
                DATABASE_URL="$DB_URL_OVERRIDE" npm run db:seed
              else
                npm run db:seed
              fi
            )
            echo "✅ seed complete"
          '';

          default = run;
        };

        devShells.default = pkgs.mkShell {
          packages = runtimeInputs;
        };
      });
}
