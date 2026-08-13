# Camp Stock

キャンプの持ち物を管理するアプリ。持ち物ごとに「今回使うか」「積んだか」をチェックでき、車/バイクどちらで行くかによって候補となる持ち物が絞り込まれる。

## 技術スタック

- フロントエンド: React（Vite）— `frontend/`
- バックエンド: AWS Lambda（Node.js）— `backend/`
- API: Amazon API Gateway（HTTP API、単一Lambda内でルーティング）
- データストア: Amazon DynamoDB
- IaC: AWS SAM — `infra/template.yaml`

## ディレクトリ構成

```
frontend/   Vite + Reactアプリ
backend/    Lambdaハンドラ・ビジネスロジック・DynamoDBリポジトリ
infra/      AWS SAMテンプレート（DynamoDBテーブル・Lambda・API Gatewayの定義）
```

## データモデル

- **持ち物マスタ（Items）**: `itemId` / `name` / `category` / `vehicleType`（`car` | `bike` | `both`）/ `storageLocation` — 持ち物そのものの情報。車/バイクいずれで使えるかを持つ
- **キャンプ（Camps）**: `campId` / `name` / `date` / `vehicleType`（`car` | `bike`）— 個々のキャンプ。移動手段を1つ選ぶ
- **キャンプごとの持ち物状態（CampItems）**: `campId` + `itemId` をキーに、そのキャンプで「今回使う」と選択された持ち物の積み込み状態（`packed`）を保持する。レコードが存在すること自体が「使用中」を表す

## API

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/items` | 持ち物マスタ一覧 |
| POST | `/items` | 持ち物マスタ作成 |
| PUT | `/items/{itemId}` | 持ち物マスタ更新 |
| DELETE | `/items/{itemId}` | 持ち物マスタ削除 |
| GET | `/camps` | キャンプ一覧 |
| POST | `/camps` | キャンプ作成 |
| GET | `/camps/{campId}` | キャンプ取得 |
| PUT | `/camps/{campId}` | キャンプ更新 |
| DELETE | `/camps/{campId}` | キャンプ削除 |
| GET | `/camps/{campId}/items` | キャンプの移動手段に対応する持ち物候補と、使用/積み込み状態のマージ結果 |
| PUT | `/camps/{campId}/items/{itemId}` | `{ used }` または `{ packed }` を指定して状態を更新 |
| DELETE | `/camps/{campId}/items/{itemId}` | 「今回使う」から除外（積み込み状態もリセット） |

## ローカル開発

```sh
cd frontend && npm install && npm run lint && npm test && npm run build
cd backend && npm install && npm run lint && npm test
```

## 初期データ

`backend/seed/items-seed.json` に、既存スプレッドシートから移行した持ち物マスタの初期データ（約150件）を収録している。`backend/seed/seed-items.js` で DynamoDB へ投入できる（AWS認証情報とテーブル名の環境変数が必要）。

```sh
cd backend
ITEMS_TABLE_NAME=camp-stock-items node seed/seed-items.js
```

## デプロイ

`infra/template.yaml`（AWS SAM）を使う。AWS認証情報・GitHub Secretsは未登録のため、本リポジトリの初期構築時点ではデプロイを行っていない。

```sh
cd infra
sam build
sam deploy --guided
```
