import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "./useAuth.js";

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="flex flex-col items-center gap-4 py-20">
      <p>Camp Stockを利用するにはGoogleアカウントでログインしてください</p>
      <GoogleLogin
        onSuccess={(credentialResponse) => login(credentialResponse.credential)}
        onError={() => {}}
      />
    </div>
  );
}
