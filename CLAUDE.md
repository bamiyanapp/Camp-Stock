@dev-standards/CLAUDE.md

# Camp-Stock 固有ルール

キャンプの持ち物を管理するアプリ。持ち物ごとに「今回使うか」「積んだか」をチェックでき、車/バイクどちらで行くかによって候補となる持ち物が絞り込まれる。

## 技術スタック

- フロントエンド: React（Vite）、`frontend/`
- バックエンド: AWS Lambda（Node.js）、`backend/`
- API: Amazon API Gateway（HTTPプロキシ統合、単一Lambda内でルーティング）
- データストア: Amazon DynamoDB
- IaC: AWS SAM、`infra/template.yaml`

## ディレクトリ構成

- `frontend/`: Vite + React アプリ（dev-standardsの`templates/vite-react-app`から作成）
- `backend/`: Lambdaハンドラ・ビジネスロジック・DynamoDBリポジトリ
- `infra/`: AWS SAMテンプレート、DynamoDBテーブル定義
- `backend/seed/`: 初期データ（持ち物マスタ）とDynamoDB投入用スクリプト

## CI/CD

- `.github/workflows/ci.yml`から dev-standardsの`reusable-ci.yml`を呼び出す（`frontend_dir: frontend`, `backend_dir: backend`）
- AWSへのデプロイ・GitHub Secrets登録は別途行う（本リポジトリの初期構築時点では未設定）
