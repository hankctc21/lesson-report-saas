import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { login } from "../api/endpoints";

type Props = {
  onLogin: (token: string) => void;
};

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("change_this_in_prod");

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: (data) => onLogin(data.accessToken)
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_20%,#d5f6ff_0,#f7fbff_35%,#fff8f0_100%)] p-6">
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl backdrop-blur-xl animate-rise">
        <p className="font-['Fraunces'] text-sm tracking-wide text-slate-600">Lesson Report</p>
        <h1 className="mt-2 font-['Fraunces'] text-3xl text-slate-900">Instructor Console</h1>
        <p className="mt-2 text-sm text-slate-600">백엔드 API(18080)에 연결된 운영 콘솔 로그인</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          <input className="field" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password" />
          <button className="btn w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "로그인 중..." : "로그인"}
          </button>
          {loginMutation.isError && <p className="text-sm text-rose-600">로그인 실패. 계정 정보를 확인하세요.</p>}
        </form>
      </div>
    </main>
  );
}
