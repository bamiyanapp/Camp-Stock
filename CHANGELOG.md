## [1.11.1](https://github.com/bamiyanapp/Camp-Stock/compare/v1.11.0...v1.11.1) (2026-08-14)


### Bug Fixes

* **frontend:** セッション保持をlocalStorageからCookieに変更し、ログアウトボタンのクラッシュを修正する ([#63](https://github.com/bamiyanapp/Camp-Stock/issues/63)) ([5aa5941](https://github.com/bamiyanapp/Camp-Stock/commit/5aa59410bf6a4e6389c7000279bc7afbbe3f6088))

# [1.11.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.10.0...v1.11.0) (2026-08-14)


### Features

* **frontend:** 持ち物・キャンプ一覧に編集と区分絞り込みを追加する ([#59](https://github.com/bamiyanapp/Camp-Stock/issues/59)) ([c101dbb](https://github.com/bamiyanapp/Camp-Stock/commit/c101dbbc5225270d194453d17172183406bc846b))

# [1.10.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.9.1...v1.10.0) (2026-08-14)


### Features

* **backend:** 新しいキャンプ作成時に前回の「今回使う」持ち物を引き継ぐ ([#56](https://github.com/bamiyanapp/Camp-Stock/issues/56)) ([8699c94](https://github.com/bamiyanapp/Camp-Stock/commit/8699c9490995affb50f3ab371ac08e9fc516aeef)), closes [#54](https://github.com/bamiyanapp/Camp-Stock/issues/54)

## [1.9.1](https://github.com/bamiyanapp/Camp-Stock/compare/v1.9.0...v1.9.1) (2026-08-14)


### Bug Fixes

* **frontend:** 「今回使う」「積んだ」の表記をヘッダーに一本化する ([#53](https://github.com/bamiyanapp/Camp-Stock/issues/53)) ([c8522f6](https://github.com/bamiyanapp/Camp-Stock/commit/c8522f65f0534ea90d80ad54d2f7de479aa8b8d5)), closes [#52](https://github.com/bamiyanapp/Camp-Stock/issues/52)

# [1.9.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.8.0...v1.9.0) (2026-08-14)


### Features

* **frontend:** ログイン中表記をアカウント画像にする ([#50](https://github.com/bamiyanapp/Camp-Stock/issues/50)) ([b9d7a31](https://github.com/bamiyanapp/Camp-Stock/commit/b9d7a3141553610292898925d664121de852300e)), closes [#49](https://github.com/bamiyanapp/Camp-Stock/issues/49)

# [1.8.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.7.2...v1.8.0) (2026-08-14)


### Features

* **frontend:** 自動ログアウトの理由をログイン画面に表示する ([#47](https://github.com/bamiyanapp/Camp-Stock/issues/47)) ([fcb40e6](https://github.com/bamiyanapp/Camp-Stock/commit/fcb40e6e3ff966db3e8d40cf18a8910c2854aa11)), closes [#45](https://github.com/bamiyanapp/Camp-Stock/issues/45)

## [1.7.2](https://github.com/bamiyanapp/Camp-Stock/compare/v1.7.1...v1.7.2) (2026-08-14)


### Bug Fixes

* **frontend:** authTokenの同期をuseEffectから同期的な呼び出しへ変更 ([#44](https://github.com/bamiyanapp/Camp-Stock/issues/44)) ([29c442b](https://github.com/bamiyanapp/Camp-Stock/commit/29c442bb6b36d25b50121ef2e340ad42c19e78d9)), closes [#43](https://github.com/bamiyanapp/Camp-Stock/issues/43)

## [1.7.1](https://github.com/bamiyanapp/Camp-Stock/compare/v1.7.0...v1.7.1) (2026-08-14)


### Bug Fixes

* **frontend:** Googleログイン失敗時のエラーを画面に表示する ([#39](https://github.com/bamiyanapp/Camp-Stock/issues/39)) ([b816fd2](https://github.com/bamiyanapp/Camp-Stock/commit/b816fd2db6222db351b1b110bbf4f95eb688cd5d)), closes [#38](https://github.com/bamiyanapp/Camp-Stock/issues/38)

# [1.7.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.6.0...v1.7.0) (2026-08-14)


### Features

* **backend:** キャンプをユーザー個別データにする ([#34](https://github.com/bamiyanapp/Camp-Stock/issues/34)) ([6e3ac0b](https://github.com/bamiyanapp/Camp-Stock/commit/6e3ac0b89b345efc2314057042df16cd911af357)), closes [#13](https://github.com/bamiyanapp/Camp-Stock/issues/13)

# [1.6.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.5.0...v1.6.0) (2026-08-14)


### Features

* **cd:** GOOGLE_OAUTH_CLIENT_IDの形式検証とハッシュ記録を追加 ([#36](https://github.com/bamiyanapp/Camp-Stock/issues/36)) ([b8dfbd4](https://github.com/bamiyanapp/Camp-Stock/commit/b8dfbd4b0338202ddf668ff660412f1693dfdaa6)), closes [#35](https://github.com/bamiyanapp/Camp-Stock/issues/35)

# [1.5.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.4.1...v1.5.0) (2026-08-14)


### Features

* **backend:** 持ち物マスタに編集ユーザー情報を保持する ([#30](https://github.com/bamiyanapp/Camp-Stock/issues/30)) ([6efd09d](https://github.com/bamiyanapp/Camp-Stock/commit/6efd09dc6055f61b30f12969af167e6a546565c2)), closes [#14](https://github.com/bamiyanapp/Camp-Stock/issues/14)

## [1.4.1](https://github.com/bamiyanapp/Camp-Stock/compare/v1.4.0...v1.4.1) (2026-08-14)


### Bug Fixes

* **cd:** GitHub SecretsのGOOGLE_CLIENT_ID参照名を実際の登録名に修正 ([#27](https://github.com/bamiyanapp/Camp-Stock/issues/27)) ([eab11e7](https://github.com/bamiyanapp/Camp-Stock/commit/eab11e7a16f8f3e51d80037f4a135f1a0d2416da)), closes [#26](https://github.com/bamiyanapp/Camp-Stock/issues/26)

# [1.4.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.3.0...v1.4.0) (2026-08-14)


### Features

* Googleアカウントによる認証を追加する ([#19](https://github.com/bamiyanapp/Camp-Stock/issues/19)) ([453f011](https://github.com/bamiyanapp/Camp-Stock/commit/453f011b704bbb854aaaa5accd4775e8480e9989)), closes [#3](https://github.com/bamiyanapp/Camp-Stock/issues/3)

# [1.3.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.2.3...v1.3.0) (2026-08-14)


### Features

* **cd:** 持ち物マスタの初期データをDynamoDBへ投入するワークフローを追加 ([#25](https://github.com/bamiyanapp/Camp-Stock/issues/25)) ([6820f22](https://github.com/bamiyanapp/Camp-Stock/commit/6820f22d5d58ae6e845cd7119cc4c21b43011cae)), closes [#24](https://github.com/bamiyanapp/Camp-Stock/issues/24)

## [1.2.3](https://github.com/bamiyanapp/Camp-Stock/compare/v1.2.2...v1.2.3) (2026-08-14)


### Bug Fixes

* **backend:** CORSプリフライト（OPTIONS）がLambdaで404になる問題を修正 ([#22](https://github.com/bamiyanapp/Camp-Stock/issues/22)) ([5601e10](https://github.com/bamiyanapp/Camp-Stock/commit/5601e10e8b028c832ae39b389985971e74a4f309)), closes [#17](https://github.com/bamiyanapp/Camp-Stock/issues/17)

## [1.2.2](https://github.com/bamiyanapp/Camp-Stock/compare/v1.2.1...v1.2.2) (2026-08-13)


### Bug Fixes

* **cd:** デプロイ後もブラウザに古いビルドがキャッシュされ続ける問題を修正 ([#21](https://github.com/bamiyanapp/Camp-Stock/issues/21)) ([286e419](https://github.com/bamiyanapp/Camp-Stock/commit/286e419fb1f32049e0ff5bc8f24605e3d8eb029c)), closes [#20](https://github.com/bamiyanapp/Camp-Stock/issues/20)

## [1.2.1](https://github.com/bamiyanapp/Camp-Stock/compare/v1.2.0...v1.2.1) (2026-08-13)


### Bug Fixes

* **backend:** POST/PUT/DELETEリクエストのCORSプリフライト失敗を修正 ([#18](https://github.com/bamiyanapp/Camp-Stock/issues/18)) ([892fcc4](https://github.com/bamiyanapp/Camp-Stock/commit/892fcc45d43dfbba3b2cfef05be7f7fdce5481d6)), closes [#17](https://github.com/bamiyanapp/Camp-Stock/issues/17)

# [1.2.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.1.0...v1.2.0) (2026-08-13)


### Features

* **frontend:** トップページにビルド日時も表示する ([#16](https://github.com/bamiyanapp/Camp-Stock/issues/16)) ([cb1e4de](https://github.com/bamiyanapp/Camp-Stock/commit/cb1e4de67db7d8a3fbf8dc0b5bfe7951fcb321dc)), closes [#15](https://github.com/bamiyanapp/Camp-Stock/issues/15)

# [1.1.0](https://github.com/bamiyanapp/Camp-Stock/compare/v1.0.0...v1.1.0) (2026-08-13)


### Features

* **frontend:** トップページに現在のアプリバージョンを表示する ([#12](https://github.com/bamiyanapp/Camp-Stock/issues/12)) ([1a210da](https://github.com/bamiyanapp/Camp-Stock/commit/1a210dadc1c8d087c35d0dc92f455003af8c8e1b))

# 1.0.0 (2026-08-13)


### Features

* **camp-stock:** キャンプ持ち物管理アプリのMVPを構築 ([#5](https://github.com/bamiyanapp/Camp-Stock/issues/5)) ([4fcd514](https://github.com/bamiyanapp/Camp-Stock/commit/4fcd5146f28db9cee528dcf2847290c40c40d1f2)), closes [#3](https://github.com/bamiyanapp/Camp-Stock/issues/3) [#1](https://github.com/bamiyanapp/Camp-Stock/issues/1) [#9](https://github.com/bamiyanapp/Camp-Stock/issues/9)
* **cd:** AWSへのCDパイプラインを実装 ([#7](https://github.com/bamiyanapp/Camp-Stock/issues/7)) ([59c2db8](https://github.com/bamiyanapp/Camp-Stock/commit/59c2db8e2eb2ae0df724a4189752d4091c00cc88)), closes [#3](https://github.com/bamiyanapp/Camp-Stock/issues/3) [#1](https://github.com/bamiyanapp/Camp-Stock/issues/1) [#6](https://github.com/bamiyanapp/Camp-Stock/issues/6)
