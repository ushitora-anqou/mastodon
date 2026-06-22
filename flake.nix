{
  description = "Mastodon development environment (Nix Flake + services-flake)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    systems.url = "github:nix-systems/default";
    process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
    services-flake.url = "github:juspay/services-flake";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake {inherit inputs;} {
      systems = import inputs.systems;
      imports = [inputs.process-compose-flake.flakeModule];

      perSystem = {
        self',
        pkgs,
        config,
        lib,
        ...
      }: let
        ldLibraryPath = lib.makeLibraryPath (with pkgs; [
          glib
          icu
          libffi
          libidn
          libpq
          libxml2
          libxslt
          libyaml
          openssl
          vips
          zlib
        ]);
      in {
        formatter = pkgs.alejandra;

        devShells.default = pkgs.mkShell {
          hardeningDisable = ["format"];
          buildInputs = with pkgs; [
            ffmpeg-headless
            file
            glib
            icu
            libffi
            libidn
            libpq
            libxml2
            libxslt
            libyaml
            nodejs_24
            openssl
            postgresql_16
            process-compose
            readline
            ruby_4_0
            shared-mime-info
            vips
            zlib
          ];
          nativeBuildInputs = with pkgs; [pkg-config which];
          inputsFrom = [
            config.process-compose.mastodon.services.outputs.devShell
          ];
          packages = [self'.packages.mastodon];
        };

        process-compose.mastodon = {config, ...}: {
          imports = [inputs.services-flake.processComposeModules.default];

          services = {
            postgres.pg = {
              enable = true;
              port = 58082;
              initialDatabases = [{name = "mastodon_development";}];
            };

            redis.rd = {
              enable = true;
              port = 58083;
            };
          };

          settings = {
            environment = [
              "RAILS_ENV=development"
              "NODE_ENV=development"
              "DB_HOST=127.0.0.1"
              "DB_PORT=58082"
              "DB_NAME=mastodon_development"
              "REDIS_HOST=127.0.0.1"
              "REDIS_PORT=58083"
              "ES_ENABLED=false"
              "LOCAL_DOMAIN=localhost:58080"
              "STREAMING_API_BASE_URL=ws://localhost:58081"
              "LD_LIBRARY_PATH=${ldLibraryPath}"
            ];

            processes = {
              secrets-setup = {
                command = pkgs.writeShellApplication {
                  name = "secrets-setup";
                  text = ''
                    set -euo pipefail
                    if [ ! -f .env.runtime ]; then
                      umask 077
                      {
                        echo "DB_USER=$(whoami)"
                        echo "SECRET_KEY_BASE=$(openssl rand -hex 64)"
                        echo "OTP_SECRET=$(openssl rand -hex 64)"
                      } > .env.runtime
                      echo "Generated .env.runtime"
                    else
                      echo ".env.runtime already exists, skipping"
                    fi
                  '';
                };
                availability.restart = "exit_on_failure";
                is_daemon = false;
              };

              deps-setup = {
                command = pkgs.writeShellApplication {
                  name = "deps-setup";
                  text = ''
                    set -euo pipefail
                    gem install bundler -v 4.0.13
                    corepack prepare yarn@4.16.0 --activate
                    bundle config set build.nokogiri --use-system-libraries
                    bundle config set path vendor/bundle
                    bundle check || bundle install
                    corepack yarn install --immutable
                  '';
                };
                depends_on.secrets-setup.condition = "process_completed_successfully";
                availability.restart = "exit_on_failure";
                is_daemon = false;
              };

              db-setup = {
                command = pkgs.writeShellApplication {
                  name = "db-setup";
                  text = ''
                    set -euo pipefail
                    set -a
                    # shellcheck disable=SC1091
                    . ./.env.runtime
                    set +a
                    if ! grep -q "^VAPID_PRIVATE_KEY=" .env.runtime 2>/dev/null; then
                      bundle exec rails mastodon:webpush:generate_vapid_key >> .env.runtime
                    fi
                    bundle exec rails db:migrate
                    if [ ! -f .db-seeded ]; then
                      bundle exec rails db:seed
                      touch .db-seeded
                    fi
                  '';
                };
                depends_on = {
                  deps-setup.condition = "process_completed_successfully";
                  pg.condition = "process_healthy";
                  rd.condition = "process_healthy";
                };
                availability.restart = "exit_on_failure";
                is_daemon = false;
              };

              web = {
                command = "set -a; . ./.env.runtime; set +a; exec bundle exec puma -C config/puma.rb";
                environment = {
                  PORT = "58080";
                  BIND = "0.0.0.0";
                };
                depends_on.db-setup.condition = "process_completed_successfully";
                readiness_probe = {
                  http_get = {
                    host = "127.0.0.1";
                    scheme = "http";
                    path = "/health";
                    port = 58080;
                  };
                  initial_delay_seconds = 5;
                  period_seconds = 10;
                  timeout_seconds = 5;
                };
                availability.restart = "on_failure";
              };

              sidekiq = {
                command = "set -a; . ./.env.runtime; set +a; exec bundle exec sidekiq";
                depends_on.db-setup.condition = "process_completed_successfully";
                ready_log_line = "connecting to Redis";
                availability.restart = "on_failure";
              };

              streaming = {
                command = "corepack yarn workspace @mastodon/streaming start";
                environment = {
                  PORT = "58081";
                  NODE_ENV = "development";
                };
                depends_on.db-setup.condition = "process_completed_successfully";
                readiness_probe = {
                  http_get = {
                    host = "127.0.0.1";
                    scheme = "http";
                    path = "/api/v1/streaming/health";
                    port = 58081;
                  };
                  initial_delay_seconds = 5;
                  period_seconds = 10;
                  timeout_seconds = 5;
                };
                availability.restart = "on_failure";
              };

              vite = {
                command = "corepack yarn dev";
                depends_on.deps-setup.condition = "process_completed_successfully";
                ready_log_line = "ready in";
                availability.restart = "on_failure";
              };
            };
          };
        };
      };
    };
}
