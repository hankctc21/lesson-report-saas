import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createClient,
  createReport,
  createSession,
  createShare,
  health,
  listClientReports,
  listClients,
  listSessionsByDate,
  listSessionsWithReportByDate
} from "../api/endpoints";

type ReportDraft = {
  summaryItems: string;
  strengthNote: string;
  improveNote: string;
  nextGoal: string;
};

const EMPTY_DRAFT: ReportDraft = {
  summaryItems: "",
  strengthNote: "",
  improveNote: "",
  nextGoal: ""
};

export default function DashboardPage({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [sessionDate, setSessionDate] = useState(today);
  const [reportClientId, setReportClientId] = useState("");
  const [selectedReportSessionId, setSelectedReportSessionId] = useState("");
  const [showReportedSession, setShowReportedSession] = useState(false);
  const [shareReportId, setShareReportId] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);

  const healthQuery = useQuery({ queryKey: ["health"], queryFn: health, refetchInterval: 15000 });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const sessionsQuery = useQuery({ queryKey: ["sessions", sessionDate], queryFn: () => listSessionsByDate(sessionDate) });
  const sessionsWithReportQuery = useQuery({
    queryKey: ["sessions-with-report", sessionDate],
    queryFn: () => listSessionsWithReportByDate(sessionDate)
  });
  const reportsQuery = useQuery({
    queryKey: ["reports", reportClientId],
    queryFn: () => listClientReports(reportClientId),
    enabled: !!reportClientId
  });

  const selectedClientOptions = useMemo(() => clientsQuery.data || [], [clientsQuery.data]);
  const clientById = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string }>();
    for (const c of selectedClientOptions) {
      map.set(c.id, { name: c.name, phone: c.phone });
    }
    return map;
  }, [selectedClientOptions]);
  const duplicateClientNames = useMemo(() => {
    const count = new Map<string, number>();
    for (const c of selectedClientOptions) {
      count.set(c.name, (count.get(c.name) || 0) + 1);
    }
    return new Set([...count.entries()].filter(([, v]) => v > 1).map(([k]) => k));
  }, [selectedClientOptions]);
  const reportSessionOptions = useMemo(() => {
    const rows = sessionsWithReportQuery.data || [];
    return showReportedSession ? rows : rows.filter((s) => !s.hasReport);
  }, [sessionsWithReportQuery.data, showReportedSession]);
  const selectedSessionInfo = useMemo(
    () => (sessionsWithReportQuery.data || []).find((s) => s.id === selectedReportSessionId),
    [sessionsWithReportQuery.data, selectedReportSessionId]
  );

  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setNotice("회원이 등록되었습니다.");
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions", sessionDate] });
      qc.invalidateQueries({ queryKey: ["sessions-with-report", sessionDate] });
      setNotice("세션이 생성되었습니다.");
    }
  });

  const createReportMutation = useMutation({
    mutationFn: createReport,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports", data.clientId] });
      qc.invalidateQueries({ queryKey: ["sessions-with-report", sessionDate] });
      setReportClientId(data.clientId);
      setShareReportId(data.id);
      setNotice(`리포트 저장 완료 (reportId: ${shortId(data.id)})`);
    }
  });

  const createShareMutation = useMutation({
    mutationFn: ({ reportId, expireHours }: { reportId: string; expireHours: number }) => createShare(reportId, expireHours),
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
      setNotice("공유 링크가 생성되었습니다.");
    }
  });

  const onCreateClient = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNotice("");
    const fd = new FormData(e.currentTarget);
    createClientMutation.mutate({
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      flagsNote: String(fd.get("flagsNote") || ""),
      note: String(fd.get("note") || "")
    });
    e.currentTarget.reset();
  };

  const onCreateSession = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNotice("");
    const fd = new FormData(e.currentTarget);
    createSessionMutation.mutate({
      clientId: String(fd.get("clientId") || ""),
      date: String(fd.get("date") || today),
      type: String(fd.get("type") || "PERSONAL") as "PERSONAL" | "GROUP",
      memo: String(fd.get("memo") || "")
    });
  };

  const onCreateReport = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNotice("");
    const sessionId = selectedReportSessionId;
    const pickedSession = (sessionsWithReportQuery.data || []).find((s) => s.id === sessionId);
    if (pickedSession) {
      setReportClientId(pickedSession.clientId);
    }

    createReportMutation.mutate({
      sessionId,
      summaryItems: draft.summaryItems,
      strengthNote: draft.strengthNote,
      improveNote: draft.improveNote,
      nextGoal: draft.nextGoal
    });
  };

  const onChangeReportSession = (sessionId: string) => {
    setSelectedReportSessionId(sessionId);
    const selected = (sessionsWithReportQuery.data || []).find((s) => s.id === sessionId);
    if (selected) {
      setReportClientId(selected.clientId);
      setNotice(selected.hasReport ? "선택한 세션에는 이미 리포트가 있습니다. 다른 세션을 선택하거나 기존 리포트를 공유하세요." : "");
    }
  };

  const onCreateShare = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNotice("");
    const fd = new FormData(e.currentTarget);
    createShareMutation.mutate({
      reportId: String(fd.get("reportId") || ""),
      expireHours: Number(fd.get("expireHours") || 72)
    });
  };

  const applyQuickDraft = () => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const hint = selectedSessionInfo?.memo?.trim() ? ` (${selectedSessionInfo?.memo})` : "";
    setDraft({
      summaryItems: `호흡 정렬, 코어 안정, 정렬 확인${hint}`,
      strengthNote: "호흡 타이밍과 집중도가 좋았음",
      improveNote: "골반/흉추 분리 움직임에서 보상 패턴 감소 필요",
      nextGoal: `다음 수업 목표: 가동성 + 안정성 균형 (${hhmm} 초안)`
    });
    setNotice("원클릭 초안을 채웠습니다. 필요한 부분만 수정 후 저장하세요.");
  };

  const startVoiceInput = (field: keyof ReportDraft) => {
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setNotice("이 브라우저는 음성 입력을 지원하지 않습니다. Chrome 최신 버전을 권장합니다.");
      return;
    }

    setNotice("음성 입력 중... 말을 마치면 자동으로 입력됩니다.");
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0]?.[0]?.transcript?.trim() || "";
      if (!text) return;
      setDraft((prev) => ({ ...prev, [field]: prev[field] ? `${prev[field]} ${text}` : text }));
      setNotice("음성 입력이 반영되었습니다.");
    };
    recognition.onerror = () => setNotice("음성 인식 중 오류가 발생했습니다.");
    recognition.start();
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("공유 링크를 복사했습니다.");
    } catch {
      setNotice("클립보드 복사에 실패했습니다.");
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#e2f6ff_0,#f4f7ff_35%,#fff8ef_100%)] p-4 md:p-8">
      <header className="mx-auto mb-6 flex w-full max-w-7xl items-center justify-between rounded-2xl border border-white/70 bg-white/70 p-4 shadow-lg backdrop-blur-md animate-rise">
        <div>
          <p className="font-['Fraunces'] text-2xl text-slate-900">Lesson Report Console</p>
          <p className="text-sm text-slate-600">Backend health: {healthQuery.data?.status || "checking"}</p>
        </div>
        <button className="btn" onClick={onLogout}>로그아웃</button>
      </header>
      {notice && (
        <section className="mx-auto mb-4 w-full max-w-7xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </section>
      )}

      <section className="mx-auto grid w-full max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="회원 등록">
          <form className="space-y-2" onSubmit={onCreateClient}>
            <input name="name" className="field" placeholder="이름" required />
            <input name="phone" className="field" placeholder="전화" />
            <input name="flagsNote" className="field" placeholder="주의사항" />
            <textarea name="note" className="field min-h-20" placeholder="메모" />
            <button className="btn w-full" disabled={createClientMutation.isPending}>저장</button>
          </form>
        </Card>

        <Card title="세션 등록">
          <form className="space-y-2" onSubmit={onCreateSession}>
            <select name="clientId" className="field" required>
              <option value="">회원 선택</option>
              {selectedClientOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              name="date"
              className="field"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
            <select name="type" className="field">
              <option value="PERSONAL">PERSONAL</option>
              <option value="GROUP">GROUP</option>
            </select>
            <textarea name="memo" className="field min-h-20" placeholder="수업 메모" />
            <button className="btn w-full" disabled={createSessionMutation.isPending}>세션 생성</button>
          </form>
        </Card>

        <Card title="리포트 등록">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-600">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showReportedSession}
                onChange={(e) => setShowReportedSession(e.target.checked)}
              />
              완료 세션도 보기
            </label>
            <button className="rounded-md border border-cyan-300 px-2 py-1 text-cyan-700" type="button" onClick={applyQuickDraft}>
              원클릭 초안
            </button>
          </div>
          <form className="space-y-2" onSubmit={onCreateReport}>
            <select
              name="sessionId"
              className="field"
              required
              value={selectedReportSessionId}
              onChange={(e) => onChangeReportSession(e.target.value)}
            >
              <option value="">세션 선택</option>
              {reportSessionOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} / {s.type} / {formatClientForSession(s.clientId, clientById, duplicateClientNames)} {s.hasReport ? "(리포트 있음)" : ""}
                </option>
              ))}
            </select>
            <FieldWithVoice
              value={draft.summaryItems}
              placeholder="요약"
              onChange={(v) => setDraft((prev) => ({ ...prev, summaryItems: v }))}
              onVoice={() => startVoiceInput("summaryItems")}
            />
            <FieldWithVoice
              value={draft.strengthNote}
              placeholder="잘된 점"
              onChange={(v) => setDraft((prev) => ({ ...prev, strengthNote: v }))}
              onVoice={() => startVoiceInput("strengthNote")}
            />
            <FieldWithVoice
              value={draft.improveNote}
              placeholder="보완점"
              onChange={(v) => setDraft((prev) => ({ ...prev, improveNote: v }))}
              onVoice={() => startVoiceInput("improveNote")}
            />
            <FieldWithVoice
              value={draft.nextGoal}
              placeholder="다음 목표"
              onChange={(v) => setDraft((prev) => ({ ...prev, nextGoal: v }))}
              onVoice={() => startVoiceInput("nextGoal")}
            />
            <button
              className="btn w-full"
              disabled={createReportMutation.isPending || !!selectedSessionInfo?.hasReport || !selectedReportSessionId}
            >
              리포트 저장
            </button>
          </form>
          {reportClientId && <p className="mt-2 text-xs text-slate-600">선택된 회원 ID: {reportClientId}</p>}
          {selectedSessionInfo?.hasReport && <p className="mt-2 text-xs text-amber-700">이미 리포트가 있는 세션입니다. 기존 리포트를 공유해보세요.</p>}
          {createReportMutation.isError && <p className="mt-2 text-xs text-rose-600">저장 실패: 같은 세션 중복 등록은 허용되지 않습니다.</p>}
          {shareReportId && <p className="mt-2 text-xs text-slate-600">최근 reportId: {shareReportId}</p>}
        </Card>

        <Card title="공유 링크 생성">
          <form className="space-y-2" onSubmit={onCreateShare}>
            <input name="reportId" className="field" placeholder="Report ID" value={shareReportId} onChange={(e) => setShareReportId(e.target.value)} required />
            <input name="expireHours" className="field" type="number" min={1} max={720} defaultValue={72} />
            <button className="btn w-full" disabled={createShareMutation.isPending}>링크 생성</button>
          </form>
          {shareUrl && (
            <div className="mt-2 space-y-1">
              <a className="block truncate text-sm text-cyan-700 underline" href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
              <button className="rounded-md border border-cyan-300 px-2 py-1 text-xs text-cyan-700" onClick={copyShareUrl}>링크 복사</button>
            </div>
          )}
        </Card>
      </section>

      <section className="mx-auto mt-6 grid w-full max-w-7xl gap-4 md:grid-cols-2">
        <Card title="회원 목록">
          <ul className="space-y-2 text-sm">
            {(clientsQuery.data || []).map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-200 bg-white/80 p-2">
                <button className="text-left font-medium text-slate-900" onClick={() => setReportClientId(c.id)}>{c.name}</button>
                <p className="text-xs text-slate-500">회원 ID: {c.id}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="회원 리포트 목록">
          <div className="mb-2 text-xs text-slate-500">selected client: {reportClientId || "none"}</div>
          {!reportClientId && <p className="mb-2 text-xs text-slate-500">회원 목록에서 이름을 클릭하거나, 리포트 등록에서 세션을 먼저 선택하세요.</p>}
          <ul className="space-y-2 text-sm">
            {(reportsQuery.data || []).map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 bg-white/80 p-2">
                <p className="font-medium text-slate-900">{r.nextGoal || "(no goal)"}</p>
                <p className="text-xs text-slate-500">reportId: {r.id}</p>
                <p className="text-xs text-slate-500">sessionId: {shortId(r.sessionId)}</p>
                <button className="mt-1 text-xs text-cyan-700 underline" onClick={() => setShareReportId(r.id)}>공유 대상 설정</button>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-lg backdrop-blur-md animate-rise">
      <h2 className="mb-3 font-['Fraunces'] text-xl text-slate-900">{title}</h2>
      {children}
    </article>
  );
}

function FieldWithVoice({ value, placeholder, onChange, onVoice }: { value: string; placeholder: string; onChange: (v: string) => void; onVoice: () => void }) {
  return (
    <div className="flex gap-2">
      <input value={value} onChange={(e) => onChange(e.target.value)} className="field" placeholder={placeholder} />
      <button type="button" className="rounded-lg border border-cyan-300 px-2 text-xs text-cyan-700" onClick={onVoice}>음성</button>
    </div>
  );
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function formatClientForSession(
  clientId: string,
  clientById: Map<string, { name: string; phone?: string }>,
  duplicateClientNames: Set<string>
) {
  const client = clientById.get(clientId);
  if (!client) return `알수없음(${shortId(clientId)})`;
  if (!duplicateClientNames.has(client.name)) return client.name;
  const phoneTail = client.phone ? client.phone.replace(/[^0-9]/g, "").slice(-4) : "";
  return `${client.name} ${phoneTail ? `(${phoneTail})` : ""} ${shortId(clientId)}`;
}

function createSpeechRecognition(): SpeechRecognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ? new w.SpeechRecognition() : w.webkitSpeechRecognition ? new w.webkitSpeechRecognition() : null;
}
