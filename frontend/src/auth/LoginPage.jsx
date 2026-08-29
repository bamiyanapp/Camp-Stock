import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "./useAuth.js";

export default function LoginPage() {
  const { login, authError } = useAuth();
  const [error, setError] = useState(null);

  async function handleSuccess(credentialResponse) {
    if (!credentialResponse.credential) {
      setError("Googleからログイン情報を取得できませんでした。もう一度お試しください。");
      return;
    }
    setError(null);
    try {
      await login(credentialResponse.credential);
    } catch {
      setError("ログイン処理に失敗しました。もう一度お試しください。");
    }
  }

  const displayedError = error || authError;

  return (
    <div className="flex flex-col items-center gap-4 py-20">
      <p>Camp Stockを利用するにはGoogleアカウントでログインしてください</p>
      {displayedError && <p className="text-error">{displayedError}</p>}
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError("ログインに失敗しました。もう一度お試しください。")}
      />
    </div>
  );
}
