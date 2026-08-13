// release-config.cjsは、CDのreleaseジョブ（enable_shared_release_config: true）が
// 実行時にリポジトリルートへコピーする（copy-release-config action）。
// このファイル自体はローカルには存在しない。
const { buildReleaseConfig } = require("./release-config.cjs");

module.exports = buildReleaseConfig({
  repositoryUrl: "https://github.com/bamiyanapp/Camp-Stock.git",
  gitAssets: ["CHANGELOG.md", "package.json", "package-lock.json"],
  // CHANGELOG.md→JSONの変換は行わない（frontendにリリースノート表示機能を持たないため）
  changelogPrepareCmd: "true",
});
