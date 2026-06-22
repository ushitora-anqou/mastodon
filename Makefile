.PHONY: dev

# Start the Mastodon development environment via Nix Flake (services-flake).
# PostgreSQL, Redis and all Mastodon processes are managed by process-compose.
# Access Mastodon at http://localhost:58080
# id: admin@localhost
# password: mastodonadmin
dev:
	nix develop -c mastodon
