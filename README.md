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

## 認証

Googleアカウント（Google Identity Services）によるログインを必須とする。フロントエンドは`@react-oauth/google`でIDトークンを取得し、`Authorization: Bearer <IDトークン>`ヘッダーを付けてAPIを呼び出す。バックエンドは`GOOGLE_CLIENT_ID`環境変数を使ってIDトークンのaudienceを検証する（`backend/src/lib/googleAuth.js`）。

Google Cloud ConsoleでOAuthクライアントID（種類: ウェブアプリケーション）を発行し、承認済みのJavaScript生成元にフロントエンドのURL（CloudFrontドメインなど）を登録しておく必要がある。

## PWA（ホーム画面追加）

`frontend/public/manifest.json`と`index.html`の`apple-mobile-web-app-*` meta タグにより、iOS Safariでホーム画面に追加した際に正式なPWA（スタンドアロン表示）として認識されるようにしている。iOS Safariには、JavaScriptから操作するストレージ（Cookie/localStorage）を一定期間サイトへの直接アクセスがないと予告なく消去するIntelligent Tracking Prevention（ITP）があり、正式なPWAとして認識されることでこの影響が緩和される可能性がある（効果はApple側の非公開の内部動作に依存し保証はできない）。

### ホーム画面追加時の更新

スマートフォンのホーム画面に追加した状態（PWA/スタンドアロン表示）でも最新版に追従できるよう、`dev-standards`の`shared/pwa/`パターン（詳細は`dev-standards/docs/service-worker-update-pattern.md`）を導入している。

- `sync-manifest.local.json`（リポジトリルート）で`shared/pwa/sw.js`・`ServiceWorkerRegistration.jsx`・`UpdateNotifier.jsx`をsymlinkとして取り込む（`node dev-standards/scripts/bootstrap.js`で同期）
- `frontend/public/sw-config.js`（実ファイル、Camp Stock固有）でキャッシュバージョン・先読みURL・APIキャッシュ対象ホストを設定する
- ページ本体（HTMLナビゲーション）はNetwork First、それ以外の同一オリジンサブリソースはStale-While-Revalidateで扱うため、デプロイ後は常に最新のHTML・アセットを取得できる
- アプリのフォアグラウンド復帰時・5分おきに更新チェックを行い、新バージョンを検知すると再読み込みを促すバナーを表示する（`UpdateNotifier`）
- `sw.js`本体のキャッシュ戦略を変更した場合は、`frontend/public/sw-config.js`の`cacheVersion`を必ず更新すること（旧キャッシュを確実に破棄させるため）

## データモデル

- **持ち物マスタ（Items）**: `itemId` / `name` / `emoji`（一覧表示用の絵文字アイコン、任意） / `category` / `vehicleType`（`car` | `bike` | `both`）/ `storageLocation` / `createdBy` / `updatedBy`（作成者・最終更新者のGoogleアカウントID） — 持ち物そのものの情報。車/バイクいずれで使えるかを持つ。認証済みユーザーであれば誰でも参照・編集できる共有データ
- **キャンプ（Camps）**: `campId` / `name` / `date` / `vehicleType`（`car` | `bike`）/ `ownerUserId`（作成者のGoogleアカウントID） / `ownerName` / `ownerEmail` / `ownerPicture`（作成者の表示用プロフィール） / `inviteToken`（招待リンクのトークン） — 個々のキャンプ。移動手段を1つ選ぶ。参照・持ち物の操作は所有者・参加者（後述のCampMembers）双方に許可し、キャンプ設定の編集・削除・招待リンクの再発行は所有者のみ許可する（それ以外は403）
- **キャンプの参加者（CampMembers）**: `campId` + `userId` をキーに、招待リンク経由でキャンプに参加したユーザー（所有者以外）を保持する。`name` / `email` / `picture`は参加時点のGoogleアカウントのプロフィールを保持する（別途Usersテーブルは持たない設計のため、その後の変更は反映されない）
- **キャンプごとの持ち物状態（CampItems）**: `campId` + `itemId` をキーに、そのキャンプで「今回使う」と選択された持ち物の積み込み状態（`packed`）と担当者（`assignedUserId`、任意。CampMembersの`userId`または所有者の`ownerUserId`を指す）を保持する。レコードが存在すること自体が「使用中」を表す。担当者は「今回使う」状態の持ち物のみ設定でき、未割り当てには`null`を指定する

## API

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/items` | 持ち物マスタ一覧 |
| POST | `/items` | 持ち物マスタ作成 |
| PUT | `/items/{itemId}` | 持ち物マスタ更新 |
| DELETE | `/items/{itemId}` | 持ち物マスタ削除 |
| GET | `/camps` | キャンプ一覧 |
| POST | `/camps` | キャンプ作成。移動手段が対応する持ち物マスタ全件を自動的に「今回使う」状態にする |
| GET | `/camps/{campId}` | キャンプ取得（所有者・参加者のみ、それ以外は403） |
| PUT | `/camps/{campId}` | キャンプ更新（所有者のみ） |
| DELETE | `/camps/{campId}` | キャンプ削除（所有者のみ） |
| GET | `/camps/{campId}/members` | 参加者一覧取得（所有者+CampMembers、所有者・参加者のみ） |
| POST | `/camps/{campId}/invite-token` | 招待リンクのトークンを再発行する（所有者のみ）。古いリンクは無効になる |
| POST | `/camps/join` | `{ inviteToken }`を指定して、リクエストしたユーザーをそのキャンプの参加者として登録する |
| GET | `/camps/{campId}/items` | キャンプの移動手段に対応する持ち物候補と、使用/積み込み状態のマージ結果（所有者・参加者のみ） |
| PUT | `/camps/{campId}/items/{itemId}` | `{ used }` または `{ packed }` または `{ assignedUserId }`（`null`で未割り当てに戻す）を指定して状態を更新（所有者・参加者のみ。`assignedUserId`は「今回使う」状態の持ち物のみ設定可） |
| DELETE | `/camps/{campId}/items/{itemId}` | 「今回使う」から除外（積み込み状態もリセット、所有者・参加者のみ） |

## ローカル開発

```sh
cd frontend && npm install && npm run lint && npm test && npm run build
cd backend && npm install && npm run lint && npm test
```

## 初期データ

`backend/seed/items-seed.json` に、既存スプレッドシートから移行した持ち物マスタの初期データ（約150件）を収録している。`backend/seed/seed-items.js` で DynamoDB へ投入できる（AWS認証情報とテーブル名の環境変数が必要）。

GitHub Actionsの`Seed items master data`ワークフロー（`.github/workflows/seed-items.yml`）から、CDと同じGitHub SecretsのAWS認証情報を使って手動実行できる（GitHubのActionsタブ→対象ワークフロー→「Run workflow」）。`itemId`をキーにしたPutItemのため、再実行しても重複せず上書きされる。

```sh
cd backend
ITEMS_TABLE_NAME=camp-stock-items node seed/seed-items.js
```

## デプロイ

`infra/template.yaml`（AWS SAM）でバックエンド（Lambda/API Gateway/DynamoDB）を、S3+CloudFrontでフロントエンドを配信する。`main`へのマージをトリガーに`.github/workflows/cd.yml`が自動でデプロイする。

### CDが必要とするGitHub Secrets

| シークレット名 | 用途 |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWSデプロイ用IAMユーザーのアクセスキー |
| `AWS_SECRET_ACCESS_KEY` | 同シークレットキー |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth 2.0クライアントID。バックエンド（Lambda環境変数`GOOGLE_CLIENT_ID`）とフロントエンド（ビルド時の`VITE_GOOGLE_CLIENT_ID`）の両方に使われる |
| `BOT_TOKEN` | （任意）semantic-releaseのバージョン更新コミット・タグpush、GitHub Release作成用 |

IAMユーザーには、CloudFormation・Lambda・API Gateway・DynamoDB・S3・CloudFront・IAM（Lambda実行ロール作成用）への権限が必要。リージョンは`.github/workflows/cd.yml`の`AWS_REGION`（既定: `ap-northeast-1`）で変更できる。

### 手動デプロイ（ローカル/デバッグ用）

```sh
cd infra
sam build
sam deploy --guided --parameter-overrides "GoogleClientId=<Google OAuthクライアントIDの値>"
```

`sam deploy`完了後、スタックの出力（`ApiEndpoint` / `FrontendBucketName` / `FrontendDistributionId` / `FrontendUrl`）を使ってフロントエンドをビルド・アップロードする。

```sh
cd frontend
VITE_API_BASE_URL=<ApiEndpointの値> VITE_GOOGLE_CLIENT_ID=<Google OAuthクライアントIDの値> npm run build
aws s3 sync dist s3://<FrontendBucketNameの値> --delete --cache-control "public, max-age=31536000, immutable" --exclude index.html
aws s3 cp dist/index.html s3://<FrontendBucketNameの値>/index.html --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id <FrontendDistributionIdの値> --paths "/*"
```
