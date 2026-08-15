import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import BackLink from "../components/BackLink.jsx";

function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.category)) {
      groups.set(item.category, []);
    }
    groups.get(item.category).push(item);
  }
  return [...groups.entries()];
}

export default function CampItemSelectionPage() {
  const { campId } = useParams();
  const [camp, setCamp] = useState(null);
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function reload() {
    setLoading(true);
    Promise.all([api.getCamp(campId), api.listCampItems(campId), api.listCampMembers(campId)])
      .then(([campResult, itemsResult, membersResult]) => {
        setCamp(campResult);
        setItems(itemsResult);
        setMembers(membersResult);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, [campId]);

  // チェック操作のたびに一覧全体を再取得すると、その都度「読み込み中...」を
  // 挟んで画面全体がちらつくため、対象アイテムのみを楽観的に更新する。
  // APIリクエストが失敗した場合のみ、その項目を元の状態に戻す。
  async function handleToggleUsed(itemId, used) {
    setItems((prevItems) =>
      prevItems.map((item) => (item.itemId === itemId ? { ...item, used } : item))
    );
    try {
      await api.setCampItemUsed(campId, itemId, used);
    } catch (err) {
      setError(err.message);
      setItems((prevItems) =>
        prevItems.map((item) => (item.itemId === itemId ? { ...item, used: !used } : item))
      );
    }
  }

  async function handleChangeAssignee(itemId, assignedUserId) {
    const previous = items.find((item) => item.itemId === itemId)?.assignedUserId ?? null;
    setItems((prevItems) =>
      prevItems.map((item) => (item.itemId === itemId ? { ...item, assignedUserId } : item))
    );
    try {
      await api.setCampItemAssignee(campId, itemId, assignedUserId);
    } catch (err) {
      setError(err.message);
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.itemId === itemId ? { ...item, assignedUserId: previous } : item
        )
      );
    }
  }

  if (loading) {
    return <p>読み込み中...</p>;
  }
  if (!camp) {
    return error ? <p className="text-error">{error}</p> : null;
  }

  return (
    <div>
      {error && <p className="mb-4 text-error">{error}</p>}
      <BackLink to={`/camps/${campId}`}>← {camp.name}へ戻る</BackLink>
      <h2 className="mb-2 text-xl font-bold">今回使う持ち物を選ぶ</h2>
      <p className="mb-6 text-sm opacity-70">
        チェックした持ち物だけが「{camp.name}」の一覧に表示されます。担当者は「今回使う」を選んだ持ち物のみ設定できます。
      </p>

      {groupByCategory(items).map(([category, categoryItems]) => (
        <section key={category} className="mb-6">
          <h3 className="mb-2 font-semibold">{category}</h3>
          <ul className="flex flex-col gap-1">
            {categoryItems.map((item) => (
              <li
                key={item.itemId}
                className="flex items-center justify-between gap-3 rounded bg-base-200 p-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={item.used}
                    aria-label={`${item.name}を今回使う`}
                    onChange={(e) => handleToggleUsed(item.itemId, e.target.checked)}
                  />
                  <span>
                    {item.emoji && <span className="mr-1">{item.emoji}</span>}
                    {item.name}
                  </span>
                </div>
                {item.used && (
                  <select
                    className="select select-bordered select-xs"
                    value={item.assignedUserId || ""}
                    aria-label={`${item.name}の担当者`}
                    onChange={(e) => handleChangeAssignee(item.itemId, e.target.value || null)}
                  >
                    <option value="">未割り当て</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name || member.email || member.userId}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
