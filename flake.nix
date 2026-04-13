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

                DOCKER_DB_HOST="127.0.0.1"
                DOCKER_DB_PORT="3306"
                DOCKER_DB_USER="appuser"
                DOCKER_DB_PASSWORD="apppass"
                DOCKER_DB_NAME="appdb"
                DOCKER_DATABASE_URL="mysql://$DOCKER_DB_USER:$DOCKER_DB_PASSWORD@$DOCKER_DB_HOST:$DOCKER_DB_PORT/$DOCKER_DB_NAME"

                FALLBACK_DB_HOST="127.0.0.1"
                FALLBACK_DB_PORT="3307"
                FALLBACK_DB_USER="root"
                FALLBACK_DB_NAME="appdb"

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

                read_api_database_url() {
                  if [ ! -f apps/api/.env ]; then
                    return 0
                  fi

                  local raw
                  raw="$(grep -m1 '^DATABASE_URL=' apps/api/.env | cut -d= -f2- || true)"
                  printf '%s' "$raw" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
                }

                upsert_api_env_var() {
                  local key="$1"
                  local value="$2"
                  local env_file="apps/api/.env"
                  local tmp_file="$env_file.tmp"

                  touch "$env_file"
                  awk -v key="$key" -v value="$value" '
                    BEGIN { replaced = 0 }
                    index($0, key "=") == 1 {
                      if (replaced == 0) {
                        print key "=" value
                        replaced = 1
                      }
                      next
                    }
                    { print }
                    END {
                      if (replaced == 0) {
                        print key "=" value
                      }
                    }
                  ' "$env_file" > "$tmp_file"
                  mv "$tmp_file" "$env_file"
                }

                set_database_url() {
                  local database_url="$1"
                  DB_URL_OVERRIDE="$database_url"
                  export DB_URL_OVERRIDE
                  export DATABASE_URL="$database_url"
                  upsert_api_env_var "DATABASE_URL" "$database_url"
                  echo "Configured apps/api/.env DATABASE_URL."
                }

                fallback_database_url_for_port() {
                  local port="$1"
                  printf 'mysql://%s@%s:%s/%s' "$FALLBACK_DB_USER" "$FALLBACK_DB_HOST" "$port" "$FALLBACK_DB_NAME"
                }

                resolve_database_url() {
                  local database_url=""
                  if [ -n "''${DB_URL_OVERRIDE:-}" ]; then
                    database_url="$DB_URL_OVERRIDE"
                  else
                    database_url="$(read_api_database_url || true)"
                  fi

                  database_url="$(printf '%s' "$database_url" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
                  if [ -z "$database_url" ]; then
                    echo "❌ DATABASE_URL is empty. Could not resolve database connection string." >&2
                    return 1
                  fi
                  printf '%s' "$database_url"
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

                  wait_for_mysql() {
                    local host="$1"
                    local port="$2"
                    local user="$3"
                    local pass="$4"
                    local attempts=0
                    while [ "$attempts" -lt 60 ]; do
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

                  is_port_open() {
                    local port="$1"
                    (echo >"/dev/tcp/$FALLBACK_DB_HOST/$port") >/dev/null 2>&1
                  }

                  choose_fallback_port() {
                    local start_port="$1"
                    local max_tries=25
                    local try=0
                    local candidate="$start_port"

                    while [ "$try" -lt "$max_tries" ]; do
                      if ! is_port_open "$candidate"; then
                        printf '%s' "$candidate"
                        return 0
                      fi
                      candidate=$((candidate + 1))
                      try=$((try + 1))
                    done

                    return 1
                  }

                  start_docker_mysql() {
                    if ! compose up -d mysql; then
                      return 1
                    fi

                    echo "Waiting for docker MySQL on $DOCKER_DB_HOST:$DOCKER_DB_PORT ..."
                    if ! wait_for_mysql "$DOCKER_DB_HOST" "$DOCKER_DB_PORT" "$DOCKER_DB_USER" "$DOCKER_DB_PASSWORD"; then
                      echo "Warning: docker MySQL did not become ready in time." >&2
                      return 1
                    fi

                    set_database_url "$DOCKER_DATABASE_URL"
                    echo "Using docker MySQL at $DOCKER_DB_HOST:$DOCKER_DB_PORT."
                    return 0
                  }

                  start_local_mysql_fallback() {
                    local repo_root
                    repo_root="$(pwd)"
                    local base_dir="$repo_root/.nix/mysql"
                    local data_dir="$base_dir/data"
                    local socket_path="$base_dir/mysql.sock"
                    local pid_path="$base_dir/mysqld.pid"
                    local port_path="$base_dir/port"
                    local log_path="$base_dir/mysqld.log"
                    local fallback_port="$FALLBACK_DB_PORT"

                    mkdir -p "$base_dir"

                    if [ ! -d "$data_dir/mysql" ]; then
                      echo "Initializing local MySQL fallback data directory..."
                      rm -rf "$data_dir"
                      mkdir -p "$data_dir"
                      if ! mariadb-install-db --datadir="$data_dir" --auth-root-authentication-method=normal >"$log_path" 2>&1; then
                        echo "Warning: failed to initialize local MySQL fallback data directory." >&2
                        echo "---- fallback log (last 40 lines) ----" >&2
                        tail -n 40 "$log_path" >&2 || true
                        echo "--------------------------------------" >&2
                        return 1
                      fi
                    fi

                    if [ -f "$pid_path" ] && kill -0 "$(cat "$pid_path" 2>/dev/null)" 2>/dev/null; then
                      if [ -f "$port_path" ]; then
                        fallback_port="$(cat "$port_path" 2>/dev/null || true)"
                      fi
                      if [ -z "$fallback_port" ]; then
                        fallback_port="$FALLBACK_DB_PORT"
                      fi

                      if wait_for_mysql "$FALLBACK_DB_HOST" "$fallback_port" "root" ""; then
                        echo "Local MySQL fallback already running on $FALLBACK_DB_HOST:$fallback_port."
                        printf '%s\n' "$fallback_port" > "$port_path"
                      else
                        echo "Warning: existing fallback mysqld pid is running but not reachable on expected port." >&2
                      fi
                    else
                      if ! fallback_port="$(choose_fallback_port "$FALLBACK_DB_PORT")"; then
                        echo "Warning: could not find an available fallback MySQL port near $FALLBACK_DB_PORT." >&2
                        return 1
                      fi

                      echo "Starting local MySQL fallback on $FALLBACK_DB_HOST:$fallback_port ..."
                      mysqld \
                        --datadir="$data_dir" \
                        --socket="$socket_path" \
                        --pid-file="$pid_path" \
                        --port="$fallback_port" \
                        --bind-address="$FALLBACK_DB_HOST" \
                        --skip-log-bin \
                        --skip-networking=0 \
                        --log-error="$log_path" \
                        --user="$(id -un)" >>"$log_path" 2>&1 &

                      printf '%s\n' "$fallback_port" > "$port_path"
                    fi

                    if ! wait_for_mysql "$FALLBACK_DB_HOST" "$fallback_port" "root" ""; then
                      echo "Warning: local MySQL fallback failed to start." >&2
                      echo "Check $log_path for details." >&2
                      echo "---- fallback log (last 40 lines) ----" >&2
                      tail -n 40 "$log_path" >&2 || true
                      echo "--------------------------------------" >&2
                      return 1
                    fi

                    if ! mysql --protocol=tcp -h"$FALLBACK_DB_HOST" -P"$fallback_port" -uroot >>"$log_path" 2>&1 <<'SQL'
CREATE DATABASE IF NOT EXISTS appdb;
SQL
                    then
                      echo "Warning: failed to prepare fallback database." >&2
                      echo "---- fallback log (last 40 lines) ----" >&2
                      tail -n 40 "$log_path" >&2 || true
                      echo "--------------------------------------" >&2
                      return 1
                    fi

                    set_database_url "$(fallback_database_url_for_port "$fallback_port")"
                    echo "Using local MySQL fallback database at $FALLBACK_DB_HOST:$fallback_port."
                    return 0
                  }

                  if [ "''${SKIP_DOCKER:-0}" = "1" ]; then
                    echo "SKIP_DOCKER=1 set; skipping docker compose and using local MySQL fallback."
                    if ! start_local_mysql_fallback; then
                      echo "❌ Failed to start local MySQL fallback. Cannot continue." >&2
                      exit 1
                    fi
                    return 0
                  fi

                  if has_compose; then
                    if start_docker_mysql; then
                      return 0
                    fi

                    echo "Warning: could not start MySQL via docker compose." >&2
                    echo "Falling back to local MySQL process managed by Nix runtime..." >&2
                  else
                    echo "Warning: docker compose not available." >&2
                    echo "Falling back to local MySQL process managed by Nix runtime..." >&2
                  fi

                  if ! start_local_mysql_fallback; then
                    echo "❌ Unable to start MySQL via docker or local fallback. Aborting." >&2
                    echo "Check .nix/mysql/mysqld.log for fallback details." >&2
                    exit 1
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
                  local database_url
                  if ! database_url="$(resolve_database_url)"; then
                    echo "❌ Cannot run Prisma without a valid DATABASE_URL." >&2
                    exit 1
                  fi

                  export DATABASE_URL="$database_url"
                  (
                    cd apps/api
                    DATABASE_URL="$database_url" npm exec prisma generate
                    DATABASE_URL="$database_url" npm exec prisma migrate deploy
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
            database_url="$(resolve_database_url)"
            (
              cd apps/api
              DATABASE_URL="$database_url" npm run db:seed
            )
            echo "✅ init complete"
          '';

          run = mkApp "run" ''
            ensure_repo_root
            ensure_env_files
            ensure_db
            ensure_deps
            migrate_db
            database_url="$(resolve_database_url)"

            DATABASE_URL="$database_url" npm --prefix apps/api run dev &
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
            database_url="$(resolve_database_url)"

            coverage_status=0
            coverage_command_failed=0

            if ! (
              cd apps/api
              DATABASE_URL="$database_url" npm run test:coverage -- \
                --coverage.reportOnFailure=true \
                --coverage.reporter=html \
                --coverage.reporter=lcov \
                --coverage.reporter=text \
                --coverage.reportsDirectory=coverage
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
            database_url="$(resolve_database_url)"
            (
              cd apps/api
              DATABASE_URL="$database_url" npm run db:unseed
            )
            echo "✅ unseed complete"
          '';

          seed = mkApp "seed" ''
            ensure_repo_root
            ensure_env_files
            ensure_db
            ensure_deps
            migrate_db
            database_url="$(resolve_database_url)"
            (
              cd apps/api
              DATABASE_URL="$database_url" npm run db:seed
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
