import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "./LoginPage.jsx";
import { AuthContext } from "./authContext.js";

let capturedProps;
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: (props) => {
    capturedProps = props;
    return <button type="button">Google でログイン</button>;
  },
}));

function renderLoginPage() {
  const login = vi.fn();
  render(
    <AuthContext.Provider value={{ idToken: null, user: null, login, logout: vi.fn() }}>
      <LoginPage />
    </AuthContext.Provider>
  );
  return { login };
}

describe("LoginPage", () => {
  it("Googleログイン成功時、credentialでloginを呼ぶ", () => {
    const { login } = renderLoginPage();
    capturedProps.onSuccess({ credential: "fake-id-token" });
    expect(login).toHaveBeenCalledWith("fake-id-token");
  });

  it("Googleログイン失敗時、エラーメッセージを表示する", async () => {
    renderLoginPage();
    capturedProps.onError();
    expect(
      await screen.findByText("ログインに失敗しました。もう一度お試しください。")
    ).toBeInTheDocument();
  });

  it("credentialが空の場合、loginを呼ばずエラーメッセージを表示する", async () => {
    const { login } = renderLoginPage();
    capturedProps.onSuccess({ credential: undefined });
    expect(login).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "Googleからログイン情報を取得できませんでした。もう一度お試しください。"
      )
    ).toBeInTheDocument();
  });
});
