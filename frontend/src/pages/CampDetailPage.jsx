import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/useAuth.js";

const VEHICLE_LABELS = { car: "車", bike: "バイク" };
const PACKED_FILTER_LABELS = { unpacked: "未済", packed: "積み込み済み" };

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

export default function CampDetailPage() {
  const { campId } = useParams();
  const { user } = useAuth();
  const [camp, setCamp] = useState(null);
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 積み込み作業中はまだ積んでいないものだけを見たいことが多いため、
  // 一覧はデフォルトで未済のみを表示し、タブで積み込み済みと切り替える。
  const [packedFilter, setPackedFilter] = useState("unpacked");

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
  async function handleTogglePacked(itemId, packed) {
    setItems((prevItems) =>
      prevItems.map((item) => (item.itemId === itemId ? { ...item, packed } : item))
    );
    try {
      await api.setCampItemPacked(campId, itemId, packed);
    } catch (err) {
      setError(err.message);
      setItems((prevItems) =>
        prevItems.map((item) => (item.itemId === itemId ? { ...item, packed: !packed } : item))
      );
    }
  }

  async function handleRegenerateInvite() {
    try {
      const updated = await api.regenerateCampInviteToken(campId);
      setCamp(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p>読み込み中...</p>;
  }
  if (!camp) {
    return error ? <p className="text-error">{error}</p> : null;
  }

  // 「今回使う」持ち物のみをメイン一覧に表示する。今回使うかどうかの選択
  // 自体は、別画面（CampItemSelectionPage）で行う。
  const usedItems = items.filter((item) => item.used);
  const packedCount = usedItems.filter((item) => item.packed).length;
  const visibleItems = usedItems.filter((item) =>
    packedFilter === "packed" ? item.packed : !item.packed
  );
  const isOwner = Boolean(user) && camp.ownerUserId === user.sub;
  const inviteUrl = camp.inviteToken ? `${window.location.origin}/join/${camp.inviteToken}` : "";

  function assigneeLabel(item) {
    if (!item.assignedUserId) {
      return null;
    }
    const member = members.find((m) => m.userId === item.assignedUserId);
    return member ? member.name || member.email || member.userId : item.assignedUserId;
  }

  return (
    <div>
      {error && <p className="mb-4 text-error">{error}</p>}
      <Link to="/" className="link mb-4 inline-block">
        ← キャンプ一覧へ戻る
      </Link>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {camp.name}（{VEHICLE_LABELS[camp.vehicleType]}）
        </h2>
        <Link to={`/camps/${campId}/select-items`} className="btn btn-sm btn-primary">
          持ち物を選ぶ
        </Link>
      </div>
      <p className="mb-4 text-sm opacity-70">
        使用予定 {usedItems.length}件中 {packedCount}件 積み込み済み
      </p>

      {members.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="opacity-70">参加者:</span>
          {members.map((member) => (
            <span key={member.userId} className="badge badge-outline">
              {member.name || member.email || "unknown"}
              {member.role === "owner" && "（作成者）"}
            </span>
          ))}
        </div>
      )}

      {isOwner && (
        <div className="mb-6 rounded bg-base-200 p-3">
          <p className="mb-2 text-sm font-semibold">招待リンク</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              className="input input-bordered input-sm flex-1"
              value={inviteUrl}
              aria-label="招待リンク"
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className="btn btn-sm btn-ghost" onClick={handleRegenerateInvite}>
              再発行
            </button>
          </div>
          <p className="mt-1 text-xs opacity-60">
            このリンクを開いたユーザーは誰でもこのキャンプに参加できます。再発行すると古いリンクは無効になります。
          </p>
        </div>
      )}

      {usedItems.length === 0 ? (
        <p className="text-sm opacity-70">
          今回使う持ち物がまだ選択されていません。「持ち物を選ぶ」から選択してください。
        </p>
      ) : (
        <>
          <div role="tablist" className="tabs tabs-boxed tabs-sm mb-4 w-fit">
            {Object.entries(PACKED_FILTER_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                className={`tab ${packedFilter === value ? "tab-active" : ""}`}
                onClick={() => setPackedFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleItems.length === 0 ? (
            <p className="text-sm opacity-70">
              {packedFilter === "packed"
                ? "積み込み済みの持ち物はありません。"
                : "未積み込みの持ち物はありません。"}
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-3 px-2 text-xs font-semibold opacity-70">
                <span>品名</span>
                <span>積んだ</span>
              </div>

              {groupByCategory(visibleItems).map(([category, categoryItems]) => (
                <section key={category} className="mb-6">
                  <h3 className="mb-2 font-semibold">{category}</h3>
                  <ul className="flex flex-col gap-1">
                    {categoryItems.map((item) => (
                      <li
                        key={item.itemId}
                        className="flex items-center justify-between gap-3 rounded bg-base-200 p-2"
                      >
                        <span className="flex items-center gap-2">
                          {item.emoji && <span className="mr-1">{item.emoji}</span>}
                          {item.name}
                          {assigneeLabel(item) && (
                            <span className="badge badge-ghost badge-sm">{assigneeLabel(item)}</span>
                          )}
                        </span>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={item.packed}
                          aria-label={`${item.name}を積んだ`}
                          onChange={(e) => handleTogglePacked(item.itemId, e.target.checked)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
