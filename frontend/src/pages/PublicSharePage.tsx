import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { openShare } from "../api/endpoints";

export default function PublicSharePage() {
  const { token = "" } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-share", token],
    queryFn: () => openShare(token),
    enabled: !!token
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(140deg,#f5f7ff_0%,#eefcff_45%,#fff3ea_100%)] p-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/50 bg-white/70 p-8 shadow-xl backdrop-blur-lg animate-rise">
        <h1 className="font-['Fraunces'] text-3xl text-slate-900">레슨 리포트 공유</h1>
        {isLoading && <p className="mt-4 text-slate-600">불러오는 중...</p>}
        {isError && <p className="mt-4 text-rose-600">링크가 만료되었거나 유효하지 않습니다.</p>}
        {data && (
          <div className="mt-6 grid gap-3 text-sm">
            <Info label="회원" value={data.clientName} />
            <Info label="수업일" value={data.sessionDate} />
            <Info label="요약" value={data.summaryItems || "-"} />
            <Info label="잘된 점" value={data.strengthNote || "-"} />
            <Info label="보완점" value={data.improveNote || "-"} />
            <Info label="다음 목표" value={data.nextGoal || "-"} />
            <Info label="조회수" value={String(data.viewCount)} />
          </div>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-slate-900">{value}</p>
    </div>
  );
}
