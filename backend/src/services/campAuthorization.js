import { ForbiddenError } from "../lib/errors.js";

// キャンプはユーザー個別データのため、所有者（ownerUserId）と一致しない
// リクエストは常に403で拒否する。キャンプ設定の変更・削除・招待リンクの
// 再発行など、所有者のみに許可する操作で使う。
export function assertCampOwner(camp, ownerUserId) {
  if ((camp.ownerUserId || null) !== (ownerUserId || null)) {
    throw new ForbiddenError(`camp is not owned by the requesting user: ${camp.campId}`);
  }
}

// キャンプの所有者、またはCampMembersに参加記録があるユーザーであれば
// 「参加者」とみなす（招待リンクによる複数参加者対応、#90）。参照系・
// 持ち物の使用/積み込み操作など、参加者全員に許可する操作で使う。
export async function isCampMember(camp, userId, campMembersRepository) {
  if ((camp.ownerUserId || null) === (userId || null)) {
    return true;
  }
  if (!userId) {
    return false;
  }
  const membership = await campMembersRepository.get(camp.campId, userId);
  return Boolean(membership);
}

export async function assertCampMember(camp, userId, campMembersRepository) {
  if (!(await isCampMember(camp, userId, campMembersRepository))) {
    throw new ForbiddenError(
      `camp is not accessible by the requesting user: ${camp.campId}`
    );
  }
}
