# CLAUDE.md

## テスト実行方法 (RSpec)

## 前提

- Nix flake ベースの開発環境 (`flake.nix` 参照)
- テストには PostgreSQL と Redis が必要。flake 付属の process-compose で起動する
- `nix develop` 内では `LD_LIBRARY_PATH` (libvips 等) が flake により自動設定される

## 手順

1. サービス起動 (PostgreSQL: 58082 / Redis: 58083):

   ```
   nix develop -c bash -c 'mastodon -D up'
   ```

2. `nix develop` に入る:

   ```
   nix develop
   ```

3. 環境変数を設定:

   ```
   set -a; . ./.env.runtime; set +a
   export RAILS_ENV=test DB_HOST=127.0.0.1 DB_PORT=58082 DB_NAME=mastodon \
          REDIS_HOST=127.0.0.1 REDIS_PORT=58083 ES_ENABLED=false
   ```

4. 初回のみ: テスト DB 作成 + マイグレーション:

   ```
   bin/rails db:create db:migrate
   ```

   (`mastodon_test` DB が生成される。`.env.runtime` の `DB_USER` を使用)

5. 初回のみ / フロントエンド資産変更時: アセットビルド:

   ```
   corepack yarn build:production
   ```

   (`public/packs` に vite の manifest が生成される。メールレンダリングを行う spec で必要。環境に `yarn` 単体コマンドは無いため `corepack yarn` を使う)

6. spec 実行:

   ```
   bin/rspec spec/services/notify_service_spec.rb
   ```

## コミット時の注意

- husky の pre-commit フック (`yarn lint-staged`) が実行されるため、コミットは必ず `nix develop` 内で行うこと。devShell の shellHook が `.devenv-bin` に corepack の yarn shim を生成して PATH に通す
- `nix develop` の外では `yarn` コマンドが見つからず、コミットがフックで失敗する
