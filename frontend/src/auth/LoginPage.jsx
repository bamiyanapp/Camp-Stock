import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "./useAuth.js";

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState(null);

  function handleSuccess(credentialResponse) {
    if (!credentialResponse.credential) {
      setError("Googleからログイン情報を取得できませんでした。もう一度お試しください。");
      return;
    }
    setError(null);
    login(credentialResponse.credential);
  }

  return (
    <div className="flex flex-col items-center gap-4 py-20">
      <p>Camp Stockを利用するにはGoogleアカウントでログインしてください</p>
      {error && <p className="text-error">{error}</p>}
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError("ログインに失敗しました。もう一度お試しください。")}
      />
    </div>
  );
}
