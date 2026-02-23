import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { openShare } from "../api/endpoints";

export default function PublicSharePage() {
  const { token = "" } = useParams();
  const [previewUrl, setPreviewUrl] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-share", token],
    queryFn: () => openShare(token),
    enabled: !!token
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(140deg,#f0f4f8_0%,#f7f9fc_45%,#f1f3f7_100%)] p-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/50 bg-white/70 p-8 shadow-xl backdrop-blur-lg animate-rise">
        <h1 className="font-['Fraunces'] text-3xl text-slate-900">레슨 리포트 공유</h1>
        {isLoading && <p className="mt-4 text-slate-600">불러오는 중...</p>}
        {isError && <p className="mt-4 text-rose-600">링크가 만료되었거나 유효하지 않습니다.</p>}
        {data && (
          <div className="mt-6 grid gap-3 text-sm">
            <Info label="회원" value={data.clientName} />
            <Info label="수업일" value={`${data.sessionDate} ${data.sessionStartTime || ""}`.trim()} />
            <Info label="요약" value={data.summaryItems || "-"} />
            <Info label="잘된 점" value={data.strengthNote || "-"} />
            <Info label="보완점" value={data.improveNote || "-"} />
            <Info label="다음 목표" value={data.nextGoal || "-"} />
            {!!data.photos?.length && (
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <p className="text-xs text-slate-500">사진 기록</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {data.photos.map((p) => (
                    <button key={p.id} type="button" onClick={() => setPreviewUrl(p.imageUrl)} className="overflow-hidden rounded-md border border-slate-200">
                      <img src={p.imageUrl} alt="session photo" className="h-20 w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!!data.progressPhotos?.length && (
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <p className="text-xs text-slate-500">비포/애프터</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {data.progressPhotos.map((p) => (
                    <button key={p.id} type="button" onClick={() => setPreviewUrl(p.imageUrl)} className="overflow-hidden rounded-md border border-slate-200">
                      <img src={p.imageUrl} alt={p.phase} className="h-20 w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Info label="조회수" value={String(data.viewCount)} />
          </div>
        )}
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="button"
          tabIndex={0}
          onClick={() => setPreviewUrl("")}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setPreviewUrl("");
          }}
        >
          <img src={previewUrl} alt="photo preview" className="max-h-[90vh] max-w-[90vw] rounded-xl border border-white/40" />
        </div>
      )}
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
