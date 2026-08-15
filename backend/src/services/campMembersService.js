import { randomUUID } from "node:crypto";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { assertCampOwner, assertCampMember } from "./campAuthorization.js";

export function createCampMembersService({ campsRepository, campMembersRepository }) {
  return {
    // 所有者+参加者の一覧を返す。表示用の名前・メールは、キャンプ作成時
    // （所有者）・参加時（参加者）にそれぞれ捕捉した値をそのまま使う
    // （別途Usersテーブルは持たない設計のため、多少古くなる可能性はあるが
    // 許容する）。
    async listMembers(campId, requestingUserId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      await assertCampMember(camp, requestingUserId, campMembersRepository);

      const memberships = await campMembersRepository.listByCamp(campId);
      return [
        {
          userId: camp.ownerUserId,
          role: "owner",
          name: camp.ownerName || null,
          email: camp.ownerEmail || null,
          picture: camp.ownerPicture || null,
        },
        ...memberships.map((member) => ({
          userId: member.userId,
          role: "member",
          name: member.name || null,
          email: member.email || null,
          picture: member.picture || null,
        })),
      ];
    },

    // 招待リンクの発行・再発行は所有者のみ行える。既存のリンクを知っている
    // 第三者を締め出したい場合はこれを呼んで新しいトークンに切り替える。
    async regenerateInviteToken(campId, requestingUserId) {
      const camp = await campsRepository.get(campId);
      if (!camp) {
        throw new NotFoundError(`camp not found: ${campId}`);
      }
      assertCampOwner(camp, requestingUserId);
      const updated = {
        ...camp,
        inviteToken: randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      return campsRepository.put(updated);
    },

    // 招待トークンを持つ認証済みユーザーをキャンプへ参加させる。
    // 所有者自身がリンクを踏んだ場合、既に参加済みの場合は何もせずキャンプを返す。
    async join(inviteToken, user) {
      if (!inviteToken) {
        throw new NotFoundError("invite token not found");
      }
      const userId = user?.userId;
      if (!userId) {
        throw new ForbiddenError("login required to join a camp");
      }

      const camps = await campsRepository.list();
      const camp = camps.find((c) => c.inviteToken === inviteToken);
      if (!camp) {
        throw new NotFoundError("invite token not found");
      }

      if ((camp.ownerUserId || null) === userId) {
        return camp;
      }

      const existing = await campMembersRepository.get(camp.campId, userId);
      if (!existing) {
        const now = new Date().toISOString();
        await campMembersRepository.put({
          campId: camp.campId,
          userId,
          name: user?.name || null,
          email: user?.email || null,
          picture: user?.picture || null,
          joinedAt: now,
        });
      }
      return camp;
    },
  };
}
