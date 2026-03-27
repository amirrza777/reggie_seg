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
                  if [ "''${SKIP_DOCKER:-0}" = "1" ]; then
                    echo "Skipping docker compose startup (SKIP_DOCKER=1)."
                    return
                  fi

                  if has_compose; then
                    if compose up -d mysql; then
                      echo "MySQL container started (or already running)."
                    else
                      echo "Warning: could not start MySQL via docker compose." >&2
                      echo "Ensure MySQL is running and DATABASE_URL in apps/api/.env is reachable." >&2
                    fi
                  else
                    echo "Warning: docker compose not available." >&2
                    echo "Ensure MySQL is already running and DATABASE_URL in apps/api/.env is reachable." >&2
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
                    npm exec prisma generate
                    npm exec prisma migrate deploy
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
              npm run db:seed
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

            test_status=0
            coverage_status=0

            if ! (
              cd apps/api
              run_non_interactive_tests
            ); then
              echo "❌ API tests failed"
              test_status=1
            fi

            if ! (
              cd apps/web
              run_non_interactive_tests
            ); then
              echo "❌ Web tests failed"
              test_status=1
            fi

            if ! (
              cd apps/api
              npm run test:coverage -- \
                --coverage.reportOnFailure=true \
                --coverage.reporter=html \
                --coverage.reporter=lcov \
                --coverage.reporter=text \
                --coverage.reportsDirectory=coverage
            ); then
              echo "❌ API coverage run failed"
              coverage_status=1
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
              echo "❌ tests entrypoint failed: coverage reports were not generated"
              exit 1
            fi

            if [ "$test_status" -ne 0 ]; then
              echo "⚠️ tests failed, but coverage reports were generated:"
              echo "   - apps/api/coverage"
              echo "   - apps/web/coverage"
              exit 0
            fi

            echo "✅ tests and coverage complete"
          '';

          unseed = mkApp "unseed" ''
            ensure_repo_root
            ensure_env_files
            ensure_db
            ensure_deps
            (
              cd apps/api
              npm run db:unseed
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
              npm run db:seed
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
