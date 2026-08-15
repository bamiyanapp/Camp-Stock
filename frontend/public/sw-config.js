// Camp Stock固有のService Worker設定（symlinkではなく実ファイル）。
// dev-standards/shared/pwa/sw.jsがimportScriptsでこのファイルを読み込む前提。
// 詳細はdev-standards/docs/service-worker-update-pattern.mdを参照。
self.SW_CONFIG = {
  // キャッシュ戦略・precacheUrls等を変更した際は必ず値を変更し、activate時に
  // 旧キャッシュを確実に破棄させること
  cacheVersion: "v1",
  // インストール時に先読みキャッシュするページ一覧。Camp Stockはクライアント
  // サイドルーティングのSPAで、CloudFrontが403/404をindex.htmlへフォールバック
  // させるため、ルートのみ先読みしておけば十分
  precacheUrls: ["/"],
  // Stale-While-Revalidateでキャッシュするバックエンド API のホスト名一覧。
  // API GETレスポンス（キャンプ・持ち物の状態）はユーザー操作のたびに変化する
  // ため、キャッシュ対象に含めない（空のままにする）
  apiHostnames: [],
};
