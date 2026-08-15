import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import BackLink from "../components/BackLink.jsx";

// 招待リンク（/join/:inviteToken）を踏んだ際に表示する画面。
// マウント時に自動でキャンプへの参加を試み、成功したらキャンプ詳細画面へ
// 遷移する。ログインしていない場合はApp.jsx側でログイン画面が優先表示され、
// ログイン後に同じURLへ戻ってくるためこの画面が改めてマウントされる。
export default function CampJoinPage() {
  const { inviteToken } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .joinCamp(inviteToken)
      .then((camp) => {
        if (!cancelled) {
          navigate(`/camps/${camp.campId}`, { replace: true });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [inviteToken, navigate]);

  if (error) {
    return (
      <div>
        <p className="mb-4 text-error">{error}</p>
        <BackLink to="/">キャンプ一覧へ戻る</BackLink>
      </div>
    );
  }

  return <p>キャンプに参加しています...</p>;
}
