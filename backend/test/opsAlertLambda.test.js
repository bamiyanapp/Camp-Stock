import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handler } from "../src/opsAlertLambda.js";
import { sendOpsAlert } from "../src/opsAlertNotifier.js";

vi.mock("../src/opsAlertNotifier.js", () => ({
  buildOpsAlertMessage: vi.fn(({ appName, alarmName }) => `${appName}:${alarmName}`),
  sendOpsAlert: vi.fn(),
}));

function snsEvent(alarm) {
  return { Records: [{ Sns: { Message: JSON.stringify(alarm) } }] };
}

describe("opsAlertLambda handler", () => {
  const originalToken = process.env.OPS_ALERT_LINE_CHANNEL_ACCESS_TOKEN;
  const originalUserId = process.env.OPS_ALERT_LINE_USER_ID;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.OPS_ALERT_LINE_CHANNEL_ACCESS_TOKEN = originalToken;
    process.env.OPS_ALERT_LINE_USER_ID = originalUserId;
  });

  it("LINE Bot未設定（Secrets空文字列）の場合は通知をスキップする", async () => {
    process.env.OPS_ALERT_LINE_CHANNEL_ACCESS_TOKEN = "";
    process.env.OPS_ALERT_LINE_USER_ID = "";

    await handler(snsEvent({ AlarmName: "camp-stock-api-errors", NewStateValue: "ALARM" }));

    expect(sendOpsAlert).not.toHaveBeenCalled();
  });

  it("LINE Bot設定済みの場合は通知を送信する", async () => {
    process.env.OPS_ALERT_LINE_CHANNEL_ACCESS_TOKEN = "token";
    process.env.OPS_ALERT_LINE_USER_ID = "user-1";

    await handler(
      snsEvent({ AlarmName: "camp-stock-api-errors", NewStateValue: "ALARM", NewStateReason: "..." })
    );

    expect(sendOpsAlert).toHaveBeenCalledWith({
      message: "Camp-Stock:camp-stock-api-errors",
      channelAccessToken: "token",
      userId: "user-1",
    });
  });

  it("LINE通知の送信に失敗しても例外を投げない", async () => {
    process.env.OPS_ALERT_LINE_CHANNEL_ACCESS_TOKEN = "token";
    process.env.OPS_ALERT_LINE_USER_ID = "user-1";
    sendOpsAlert.mockRejectedValueOnce(new Error("HTTP 500"));

    await expect(
      handler(snsEvent({ AlarmName: "camp-stock-api-errors", NewStateValue: "ALARM" }))
    ).resolves.toBeUndefined();
  });

  it("event.Recordsが無い場合は何もしない", async () => {
    process.env.OPS_ALERT_LINE_CHANNEL_ACCESS_TOKEN = "token";
    process.env.OPS_ALERT_LINE_USER_ID = "user-1";

    await handler({});

    expect(sendOpsAlert).not.toHaveBeenCalled();
  });
});
