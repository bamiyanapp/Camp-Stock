import { buildOpsAlertMessage, sendOpsAlert } from "./opsAlertNotifier.js"; // symlink先

// CloudWatch Alarm（ApiFunctionのエラー・スロットリング検知）がSNS経由で呼び出すハンドラ。
// 運用監視専用LINE Bot（全プロダクト共通、未開設の場合はOPS_ALERT_LINE_*が空文字列になる）
// へ通知する。LINE Bot未開設の間はログ出力のみで正常終了し、Lambda自体を失敗させない
// （SNSの再試行でアラーム通知が重複することを避けるため）。
export async function handler(event) {
  const channelAccessToken = process.env.OPS_ALERT_LINE_CHANNEL_ACCESS_TOKEN;
  const userId = process.env.OPS_ALERT_LINE_USER_ID;

  for (const record of event.Records ?? []) {
    const alarm = JSON.parse(record.Sns.Message);
    const message = buildOpsAlertMessage({
      appName: "Camp-Stock",
      alarmName: alarm.AlarmName,
      newState: alarm.NewStateValue,
      reason: alarm.NewStateReason,
    });

    if (!channelAccessToken || !userId) {
      console.log("運用監視専用LINE Botが未設定のため通知をスキップしました:", message);
      continue;
    }

    try {
      await sendOpsAlert({ message, channelAccessToken, userId });
    } catch (error) {
      console.error("運用アラートのLINE通知に失敗しました:", error);
    }
  }
}
