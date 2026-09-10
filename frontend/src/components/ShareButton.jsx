import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// dev-standards/shared/ui/ShareButton.jsxはBootstrap 5.3クラスへ統一されており
// （dev-standards issue #328・PR #349、examinationのBootstrap移行に合わせたもの）、
// Tailwind/daisyUI構成のCamp-Stockでは無スタイルになってしまう
// （dev-standards issue #393）。そのため、symlink共有をやめてdaisyUI版を
// このファイルにローカルで保持する。ロジック（props・状態管理）は共有版と同一。
//
// 現在のページ（既定ではwindow.location.href）をQRコードで表示し、URLをワンタップ
// コピーできるボタン＋モーダル。スマートフォンオンリーの利用環境で、家族間・
// チーム間の画面共有にQRコードの読み取りが最も簡便であることを想定している。
//
// label: トリガーボタン・モーダル見出しの文言
// className: トリガーボタンへ追加するクラス名（メニュー項目等、埋め込み先の見た目に合わせる）
// getUrl: 共有するURLを返す関数（既定はwindow.location.href）
export default function ShareButton({ label = "このページを共有", className = "", getUrl = () => window.location.href }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  function openShare() {
    setCopied(false);
    setShareUrl(getUrl());
    setOpen(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // クリップボードAPIが使えない環境では、URLのテキスト選択・手動コピーで代替する
    }
  }

  return (
    <>
      <button type="button" onClick={openShare} className={className}>
        {label}
      </button>

      {open && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">{label}</h3>
            <div className="my-4 flex justify-center">
              <QRCodeSVG value={shareUrl} size={200} />
            </div>
            <p className="bg-base-200 rounded-box p-2 text-sm break-all select-all">{shareUrl}</p>
            <div className="modal-action">
              <button type="button" className="btn btn-sm" onClick={handleCopy}>
                {copied ? "コピーしました" : "URLをコピー"}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
                閉じる
              </button>
            </div>
          </div>
          <button type="button" className="modal-backdrop" aria-label="閉じる" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
