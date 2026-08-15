import { Link } from "react-router-dom";

// 前の画面へ戻るリンク。複数画面で重複していたスタイルを統一する。
export default function BackLink({ to, children }) {
  return (
    <Link to={to} className="link mb-4 inline-block">
      {children}
    </Link>
  );
}
