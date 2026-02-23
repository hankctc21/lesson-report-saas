import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createClient,
  createReport,
  createSession,
  createShare,
  health,
  listClientReports,
  listClients,
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
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [showReportedSession, setShowReportedSession] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [sharePublicUrl, setSharePublicUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [newSessionCue, setNewSessionCue] = useState(false);
  const [lastSavedSessionId, setLastSavedSessionId] = useState("");
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);

  const healthQuery = useQuery({ queryKey: ["health"], queryFn: health, refetchInterval: 15000 });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const sessionsQuery = useQuery({
    queryKey: ["sessions-with-report", sessionDate],
    queryFn: () => listSessionsWithReportByDate(sessionDate)
  });
  const reportsQuery = useQuery({
    queryKey: ["reports", selectedMemberId],
    queryFn: () => listClientReports(selectedMemberId),
    enabled: !!selectedMemberId
  });

  const clients = useMemo(() => clientsQuery.data || [], [clientsQuery.data]);
  const filteredClients = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || "").includes(q));
  }, [clients, memberSearch]);

  const selectedClient = useMemo(() => clients.find((c) => c.id === selectedMemberId) || null, [clients, selectedMemberId]);

  const sessionsForSelectedMember = useMemo(() => {
    const rows = sessionsQuery.data || [];
    const byMember = rows.filter((s) => s.clientId === selectedMemberId);
    return showReportedSession ? byMember : byMember.filter((s) => !s.hasReport);
  }, [sessionsQuery.data, selectedMemberId, showReportedSession]);

  const selectedSession = useMemo(
    () => (sessionsQuery.data || []).find((s) => s.id === selectedSessionId) || null,
    [sessionsQuery.data, selectedSessionId]
  );

  const reports = useMemo(() => reportsQuery.data || [], [reportsQuery.data]);
  const selectedReport = useMemo(() => reports.find((r) => r.id === selectedReportId) || null, [reports, selectedReportId]);

  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setSelectedMemberId(data.id);
      setShowMemberForm(false);
      setNotice("회원이 등록되었습니다. 이제 세션을 만들어주세요.");
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sessions-with-report", sessionDate] });
      setSelectedSessionId(data.id);
      setSelectedMemberId(data.clientId);
      setNewSessionCue(true);
      setNotice("세션 생성 완료. 아래 리포트 작성으로 이어서 진행하세요.");
    }
  });

  const createReportMutation = useMutation({
    mutationFn: createReport,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports", data.clientId] });
      qc.invalidateQueries({ queryKey: ["sessions-with-report", sessionDate] });
      setSelectedReportId(data.id);
      setLastSavedSessionId(data.sessionId);
      setNotice("리포트 저장 완료. 필요하면 바로 공유 링크를 생성하세요.");
    }
  });

  const createShareMutation = useMutation({
    mutationFn: ({ reportId, expireHours }: { reportId: string; expireHours: number }) => createShare(reportId, expireHours),
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
      setSharePublicUrl(`${window.location.origin}/share/${data.token}`);
      setNotice("공유 링크가 생성되었습니다.");
    }
  });

  useEffect(() => {
    if (!newSessionCue) return;
    const t = setTimeout(() => setNewSessionCue(false), 1600);
    return () => clearTimeout(t);
  }, [newSessionCue]);

  useEffect(() => {
    if (!selectedSessionId) return;
    const stillVisible = sessionsForSelectedMember.some((s) => s.id === selectedSessionId);
    if (stillVisible) return;
    if (showReportedSession) return;
    setSelectedSessionId(sessionsForSelectedMember[0]?.id || "");
  }, [selectedSessionId, sessionsForSelectedMember, showReportedSession]);

  useEffect(() => {
    if (!selectedMemberId) {
      setSelectedSessionId("");
      setSelectedReportId("");
      return;
    }
    const exists = clients.some((c) => c.id === selectedMemberId);
    if (!exists) setSelectedMemberId("");
  }, [clients, selectedMemberId]);

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
    if (!selectedMemberId) {
      setNotice("먼저 회원을 선택해주세요.");
      return;
    }
    setNotice("");
    const fd = new FormData(e.currentTarget);
    createSessionMutation.mutate({
      clientId: selectedMemberId,
      date: String(fd.get("date") || today),
      type: String(fd.get("type") || "PERSONAL") as "PERSONAL" | "GROUP",
      memo: String(fd.get("memo") || "")
    });
  };

  const onCreateReport = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSessionId) {
      setNotice("먼저 세션을 선택해주세요.");
      return;
    }
    setNotice("");
    createReportMutation.mutate({
      sessionId: selectedSessionId,
      summaryItems: draft.summaryItems,
      strengthNote: draft.strengthNote,
      improveNote: draft.improveNote,
      nextGoal: draft.nextGoal
    });
  };

  const onCreateShare = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReportId) {
      setNotice("먼저 공유할 리포트를 선택해주세요.");
      return;
    }
    setNotice("");
    const fd = new FormData(e.currentTarget);
    createShareMutation.mutate({
      reportId: selectedReportId,
      expireHours: Number(fd.get("expireHours") || 72)
    });
  };

  const applyQuickDraft = () => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setDraft({
      summaryItems: `호흡 정렬, 코어 안정, 정렬 확인${selectedSession?.memo ? ` (${selectedSession.memo})` : ""}`,
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
    setNotice("음성 입력 중... 말을 마치면 자동 입력됩니다.");
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
    const target = sharePublicUrl || shareUrl;
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setNotice("공유 링크를 복사했습니다.");
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = target;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setNotice("공유 링크를 복사했습니다.");
      } catch {
        setNotice("클립보드 복사에 실패했습니다.");
      }
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

      <section className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[360px_1fr]">
        <Card title="회원 목록">
          <div className="mb-2 flex gap-2">
            <input
              className="field"
              placeholder="이름/전화 검색"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
            <button className="rounded-lg border border-cyan-300 px-2 text-cyan-700" onClick={() => setShowMemberForm((v) => !v)}>
              {showMemberForm ? "닫기" : "회원 등록"}
            </button>
          </div>

          {showMemberForm && (
            <form className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-white/80 p-2" onSubmit={onCreateClient}>
              <input name="name" className="field" placeholder="이름" required />
              <input name="phone" className="field" placeholder="전화" />
              <input name="flagsNote" className="field" placeholder="주의사항" />
              <textarea name="note" className="field min-h-16" placeholder="메모" />
              <button className="btn w-full" disabled={createClientMutation.isPending}>{createClientMutation.isPending ? "저장중..." : "회원 저장"}</button>
            </form>
          )}

          <ul className="max-h-[56vh] space-y-2 overflow-y-auto pr-1 text-sm">
            {filteredClients.map((c) => (
              <li
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMemberId(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedMemberId(c.id);
                  }
                }}
                className={`rounded-lg border p-2 ${selectedMemberId === c.id ? "border-cyan-400 bg-cyan-50" : "border-slate-200 bg-white/80"}`}
              >
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.phone || "전화 없음"}</p>
              </li>
            ))}
          </ul>

          {selectedClient && (
            <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs">
              <p className="mb-2 font-semibold text-slate-900">선택 회원 정보</p>
              <DetailRow label="이름" value={selectedClient.name} />
              <DetailRow label="전화" value={selectedClient.phone || "-"} />
              <DetailRow label="주의사항" value={selectedClient.flagsNote || "-"} />
              <DetailRow label="메모" value={selectedClient.note || "-"} />
              <DetailRow label="리포트 수" value={String(reports.length)} />
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="세션 등록">
            <div className="mb-2 text-sm text-slate-600">
              선택 회원: <b>{selectedClient?.name || "없음"}</b>
            </div>
            <form className="grid gap-2 md:grid-cols-4" onSubmit={onCreateSession}>
              <input
                name="date"
                className="field"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
              <select name="type" className="field">
                <option value="PERSONAL">개인</option>
                <option value="GROUP">그룹</option>
              </select>
              <input name="memo" className="field md:col-span-2" placeholder="수업 메모" />
              <button className="btn md:col-span-4" disabled={createSessionMutation.isPending || !selectedMemberId}>
                {createSessionMutation.isPending ? "생성중..." : "세션 생성"}
              </button>
            </form>
          </Card>

          <Card title="리포트 등록" className={newSessionCue ? "ring-2 ring-cyan-300 animate-pulse" : ""}>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={showReportedSession} onChange={(e) => setShowReportedSession(e.target.checked)} />
                완료 세션도 보기
              </label>
              <button className="rounded-md border border-cyan-300 px-2 py-1 text-cyan-700" type="button" onClick={applyQuickDraft}>원클릭 초안</button>
            </div>
            {!showReportedSession && (
              <p className="mb-2 text-xs text-slate-500">완료된 세션은 기본 숨김입니다. 필요하면 `완료 세션도 보기`를 체크하세요.</p>
            )}

            <form className="space-y-2" onSubmit={onCreateReport}>
              <select className="field" value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)} required>
                <option value="">세션 선택</option>
                {sessionsForSelectedMember.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.date} / {s.type === "PERSONAL" ? "개인" : "그룹"} / {selectedClient?.name || "회원"} {s.hasReport ? "(리포트 있음)" : ""}
                  </option>
                ))}
              </select>

              <FieldWithVoice value={draft.summaryItems} placeholder="요약" onChange={(v) => setDraft((p) => ({ ...p, summaryItems: v }))} onVoice={() => startVoiceInput("summaryItems")} />
              <FieldWithVoice value={draft.strengthNote} placeholder="잘된 점" onChange={(v) => setDraft((p) => ({ ...p, strengthNote: v }))} onVoice={() => startVoiceInput("strengthNote")} />
              <FieldWithVoice value={draft.improveNote} placeholder="보완점" onChange={(v) => setDraft((p) => ({ ...p, improveNote: v }))} onVoice={() => startVoiceInput("improveNote")} />
              <FieldWithVoice value={draft.nextGoal} placeholder="다음 목표" onChange={(v) => setDraft((p) => ({ ...p, nextGoal: v }))} onVoice={() => startVoiceInput("nextGoal")} />

              <button className="btn w-full" disabled={createReportMutation.isPending || !selectedSessionId || !!selectedSession?.hasReport}>
                {createReportMutation.isPending ? "저장중..." : "리포트 저장"}
              </button>
            </form>

            {selectedSession?.hasReport && selectedSessionId !== lastSavedSessionId && (
              <p className="mt-2 text-xs text-amber-700">이미 리포트가 있는 세션입니다. 아래 목록에서 기존 리포트를 확인하세요.</p>
            )}
          </Card>

          <section className="grid gap-4 md:grid-cols-2">
            <Card title="리포트 목록">
              <ul className="max-h-[36vh] space-y-2 overflow-y-auto pr-1 text-sm">
                {reports.map((r) => (
                  <li
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedReportId(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedReportId(r.id);
                      }
                    }}
                    className={`rounded-lg border p-2 ${selectedReportId === r.id ? "border-cyan-400 bg-cyan-50" : "border-slate-200 bg-white/80"}`}
                  >
                    <p className="font-medium text-slate-900">{r.nextGoal || "목표 미입력"}</p>
                    <p className="text-xs text-slate-500">작성일: {formatDateTime(r.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="리포트 상세 / 공유">
              {!selectedReport && <p className="text-sm text-slate-500">왼쪽 목록에서 리포트를 선택하세요.</p>}
              {selectedReport && (
                <div className="space-y-2 text-xs">
                  <DetailRow label="작성일" value={formatDateTime(selectedReport.createdAt)} />
                  <DetailRow label="요약" value={selectedReport.summaryItems || "-"} />
                  <DetailRow label="잘된 점" value={selectedReport.strengthNote || "-"} />
                  <DetailRow label="보완점" value={selectedReport.improveNote || "-"} />
                  <DetailRow label="다음 목표" value={selectedReport.nextGoal || "-"} />

                  <form className="mt-2 space-y-2" onSubmit={onCreateShare}>
                    <input name="expireHours" className="field" type="number" min={1} max={720} defaultValue={72} />
                    <button className="btn w-full" disabled={createShareMutation.isPending || !selectedReportId}>
                      {createShareMutation.isPending ? "생성중..." : "공유 링크 생성"}
                    </button>
                  </form>

                  {sharePublicUrl && (
                    <div className="space-y-1">
                      <a className="block truncate text-sm text-cyan-700 underline" href={sharePublicUrl} target="_blank" rel="noreferrer">
                        {sharePublicUrl}
                      </a>
                      <button type="button" className="rounded-md border border-cyan-300 px-2 py-1 text-xs text-cyan-700" onClick={copyShareUrl}>
                        링크 복사
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </section>
        </div>
      </section>
    </main>
  );
}

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <article className={`rounded-2xl border border-white/70 bg-white/70 p-4 shadow-lg backdrop-blur-md animate-rise ${className}`}>
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

function createSpeechRecognition(): SpeechRecognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ? new w.SpeechRecognition() : w.webkitSpeechRecognition ? new w.webkitSpeechRecognition() : null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1">
      <span className="font-medium text-slate-700">{label}: </span>
      <span className="text-slate-600">{value}</span>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}
