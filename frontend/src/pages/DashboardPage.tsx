import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCenter,
  createClient,
  createClientHomework,
  createGroupSequence,
  createReport,
  createSession,
  createShare,
  getClientProfile,
  health,
  listCenters,
  listClientHomeworks,
  listClientProgressPhotos,
  listClientReports,
  listClients,
  listGroupSequences,
  listReportPhotos,
  listSessionsWithReportByDate,
  uploadClientProgressPhoto,
  uploadReportPhoto,
  upsertClientProfile,
  updateClient,
  updateReport
} from "../api/endpoints";
import { api } from "../api/client";

type ReportDraft = {
  summaryItems: string;
  strengthNote: string;
  improveNote: string;
  nextGoal: string;
};

type ClientEditDraft = {
  name: string;
  phone: string;
  flagsNote: string;
  note: string;
};

type BrowserSpeechRecognition = SpeechRecognition & {
  stop: () => void;
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
};
type PersonalMeta = {
  painNote: string;
  goalNote: string;
  surgeryHistory: string;
  beforeClassMemo: string;
  afterClassMemo: string;
  nextLessonPlan: string;
  homeworkGiven: string;
  homeworkReminderAt: string;
};
type GroupSequenceLog = {
  id: string;
  centerId: string;
  classDate: string;
  equipmentBrand: string;
  springSetting: string;
  todaySequence: string;
  nextSequence: string;
  beforeMemo: string;
  afterMemo: string;
  memberNotes: string;
  createdAt: string;
};

const EMPTY_DRAFT: ReportDraft = {
  summaryItems: "",
  strengthNote: "",
  improveNote: "",
  nextGoal: ""
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "10", "20", "30", "40", "50"];
const PERSONAL_META_EMPTY: PersonalMeta = {
  painNote: "",
  goalNote: "",
  surgeryHistory: "",
  beforeClassMemo: "",
  afterClassMemo: "",
  nextLessonPlan: "",
  homeworkGiven: "",
  homeworkReminderAt: ""
};

export default function DashboardPage({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [sessionDate, setSessionDate] = useState(today);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [activeTab, setActiveTab] = useState<"lesson" | "member">("lesson");
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [newCenterName, setNewCenterName] = useState("");
  const [sessionStartHour, setSessionStartHour] = useState("");
  const [sessionStartMinute, setSessionStartMinute] = useState("00");
  const [showReportedSession, setShowReportedSession] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showMemberEditForm, setShowMemberEditForm] = useState(false);
  const [showReportEditForm, setShowReportEditForm] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [sharePublicUrl, setSharePublicUrl] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const [notice, setNotice] = useState("");
  const [newSessionCue, setNewSessionCue] = useState(false);
  const [pendingSessionAutoSelectId, setPendingSessionAutoSelectId] = useState("");
  const [lastSavedSessionId, setLastSavedSessionId] = useState("");
  const [suppressHasReportWarning, setSuppressHasReportWarning] = useState(false);
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [clientEditDraft, setClientEditDraft] = useState<ClientEditDraft>({ name: "", phone: "", flagsNote: "", note: "" });
  const [reportEditDraft, setReportEditDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [activeVoiceField, setActiveVoiceField] = useState<keyof ReportDraft | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState("");
  const [progressPhotoPhase, setProgressPhotoPhase] = useState<"BEFORE" | "AFTER" | "ETC">("ETC");
  const [progressPhotoNote, setProgressPhotoNote] = useState("");
  const [progressPhotoTakenOn, setProgressPhotoTakenOn] = useState(today);
  const [photoObjectUrls, setPhotoObjectUrls] = useState<Record<string, string>>({});
  const [clientProgressPhotoUrls, setClientProgressPhotoUrls] = useState<Record<string, string>>({});
  const [personalMetaDraft, setPersonalMetaDraft] = useState<PersonalMeta>(PERSONAL_META_EMPTY);
  const [groupDraft, setGroupDraft] = useState<Omit<GroupSequenceLog, "id" | "createdAt">>({
    centerId: selectedCenterId,
    classDate: today,
    equipmentBrand: "",
    springSetting: "",
    todaySequence: "",
    nextSequence: "",
    beforeMemo: "",
    afterMemo: "",
    memberNotes: ""
  });
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const healthQuery = useQuery({ queryKey: ["health"], queryFn: health, refetchInterval: 15000 });
  const centersQuery = useQuery({ queryKey: ["centers"], queryFn: listCenters });
  const clientsQuery = useQuery({ queryKey: ["clients", selectedCenterId], queryFn: () => listClients(selectedCenterId || undefined), enabled: !!selectedCenterId });
  const sessionsQuery = useQuery({
    queryKey: ["sessions-with-report", sessionDate],
    queryFn: () => listSessionsWithReportByDate(sessionDate)
  });
  const reportsQuery = useQuery({
    queryKey: ["reports", selectedMemberId],
    queryFn: () => listClientReports(selectedMemberId),
    enabled: !!selectedMemberId
  });
  const reportPhotosQuery = useQuery({
    queryKey: ["report-photos", selectedReportId],
    queryFn: () => listReportPhotos(selectedReportId),
    enabled: !!selectedReportId
  });
  const clientProfileQuery = useQuery({
    queryKey: ["client-profile", selectedMemberId],
    queryFn: () => getClientProfile(selectedMemberId),
    enabled: !!selectedMemberId
  });
  const clientHomeworksQuery = useQuery({
    queryKey: ["client-homeworks", selectedMemberId],
    queryFn: () => listClientHomeworks(selectedMemberId),
    enabled: !!selectedMemberId
  });
  const groupSequencesQuery = useQuery({
    queryKey: ["group-sequences", selectedCenterId],
    queryFn: () => listGroupSequences(selectedCenterId),
    enabled: !!selectedCenterId
  });
  const clientProgressPhotosQuery = useQuery({
    queryKey: ["client-progress-photos", selectedMemberId],
    queryFn: () => listClientProgressPhotos(selectedMemberId),
    enabled: !!selectedMemberId
  });

  const centers = useMemo(() => centersQuery.data || [], [centersQuery.data]);
  const clients = useMemo(() => clientsQuery.data || [], [clientsQuery.data]);
  const selectedCenter = useMemo(
    () => centers.find((c) => c.id === selectedCenterId) || centers[0] || null,
    [centers, selectedCenterId]
  );
  const filteredClients = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const base = clients;
    if (!q) return base;
    return base.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || "").includes(q));
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
  const groupLogsByCenter = useMemo(
    () => (groupSequencesQuery.data || []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [groupSequencesQuery.data]
  );

  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients", selectedCenterId] });
      setSelectedMemberId(data.id);
      setShowMemberForm(false);
      setNotice("회원이 등록되었습니다. 이제 세션을 만들어주세요.");
    }
  });
  const createCenterMutation = useMutation({
    mutationFn: createCenter,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["centers"] });
      setSelectedCenterId(data.id);
      setNewCenterName("");
      setNotice("센터가 추가되었습니다.");
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sessions-with-report", sessionDate] });
      setSelectedSessionId(data.id);
      setPendingSessionAutoSelectId(data.id);
      setSelectedMemberId(data.clientId);
      setNewSessionCue(true);
      setNotice("세션 생성 완료. 아래 리포트 작성으로 이어서 진행하세요.");
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ clientId, payload }: { clientId: string; payload: { name?: string; centerId?: string; phone?: string; flagsNote?: string; note?: string } }) =>
      updateClient(clientId, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients", selectedCenterId] });
      setSelectedMemberId(data.id);
      setShowMemberEditForm(false);
      setNotice("회원 정보가 수정되었습니다.");
    }
  });

  const createReportMutation = useMutation({
    mutationFn: createReport,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports", data.clientId] });
      qc.invalidateQueries({ queryKey: ["sessions-with-report", sessionDate] });
      setSelectedReportId(data.id);
      setLastSavedSessionId(data.sessionId);
      setSuppressHasReportWarning(true);
      setNotice("리포트 저장 완료. 필요하면 바로 공유 링크를 생성하세요.");
    }
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ reportId, payload }: { reportId: string; payload: ReportDraft }) =>
      updateReport(reportId, {
        summaryItems: payload.summaryItems || undefined,
        strengthNote: payload.strengthNote || undefined,
        improveNote: payload.improveNote || undefined,
        nextGoal: payload.nextGoal || undefined
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports", data.clientId] });
      setSelectedReportId(data.id);
      setShowReportEditForm(false);
      setNotice("리포트가 수정되었습니다.");
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
  const uploadPhotoMutation = useMutation({
    mutationFn: ({ reportId, file }: { reportId: string; file: File }) => uploadReportPhoto(reportId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-photos", selectedReportId] });
      setNotice("사진이 업로드되었습니다.");
    }
  });
  const upsertClientProfileMutation = useMutation({
    mutationFn: ({ clientId, payload }: { clientId: string; payload: Omit<PersonalMeta, "homeworkGiven" | "homeworkReminderAt"> }) =>
      upsertClientProfile(clientId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-profile", selectedMemberId] });
    }
  });
  const createHomeworkMutation = useMutation({
    mutationFn: ({ clientId, content, remindAt }: { clientId: string; content: string; remindAt?: string }) =>
      createClientHomework(clientId, { content, remindAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-homeworks", selectedMemberId] });
    }
  });
  const createGroupSequenceMutation = useMutation({
    mutationFn: createGroupSequence,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-sequences", selectedCenterId] });
    }
  });
  const uploadClientProgressPhotoMutation = useMutation({
    mutationFn: ({
      clientId,
      file,
      phase,
      note,
      takenOn
    }: {
      clientId: string;
      file: File;
      phase?: "BEFORE" | "AFTER" | "ETC";
      note?: string;
      takenOn?: string;
    }) => uploadClientProgressPhoto(clientId, file, { phase, note, takenOn }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-progress-photos", selectedMemberId] });
      setNotice("비포/애프터 사진을 저장했습니다.");
    }
  });

  useEffect(() => {
    if (!newSessionCue) return;
    const t = setTimeout(() => setNewSessionCue(false), 1600);
    return () => clearTimeout(t);
  }, [newSessionCue]);

  useEffect(() => {
    if (copyState === "idle") return;
    const t = setTimeout(() => setCopyState("idle"), 1400);
    return () => clearTimeout(t);
  }, [copyState]);

  useEffect(() => {
    setCopyState("idle");
  }, [sharePublicUrl, shareUrl]);

  useEffect(() => {
    if (!selectedSessionId) return;
    const stillVisible = sessionsForSelectedMember.some((s) => s.id === selectedSessionId);
    if (stillVisible) return;
    if (showReportedSession) return;
    setSelectedSessionId(sessionsForSelectedMember[0]?.id || "");
  }, [selectedSessionId, sessionsForSelectedMember, showReportedSession]);

  useEffect(() => {
    if (!pendingSessionAutoSelectId) return;
    const created = (sessionsQuery.data || []).find((s) => s.id === pendingSessionAutoSelectId);
    if (!created) return;
    setSelectedMemberId(created.clientId);
    setSelectedSessionId(created.id);
    setSuppressHasReportWarning(false);
    setPendingSessionAutoSelectId("");
  }, [pendingSessionAutoSelectId, sessionsQuery.data]);

  useEffect(() => {
    if (!selectedMemberId) {
      setSelectedSessionId("");
      setSelectedReportId("");
      return;
    }
    const exists = clients.some((c) => c.id === selectedMemberId);
    if (!exists) setSelectedMemberId("");
  }, [clients, selectedMemberId]);

  useEffect(() => {
    if (!selectedClient) {
      setShowMemberEditForm(false);
      setClientEditDraft({ name: "", phone: "", flagsNote: "", note: "" });
      return;
    }
    setClientEditDraft({
      name: selectedClient.name || "",
      phone: selectedClient.phone || "",
      flagsNote: selectedClient.flagsNote || "",
      note: selectedClient.note || ""
    });
  }, [selectedClient]);

  useEffect(() => {
    if (!selectedReport) {
      setShowReportEditForm(false);
      setReportEditDraft(EMPTY_DRAFT);
      return;
    }
    setReportEditDraft({
      summaryItems: selectedReport.summaryItems || "",
      strengthNote: selectedReport.strengthNote || "",
      improveNote: selectedReport.improveNote || "",
      nextGoal: selectedReport.nextGoal || ""
    });
  }, [selectedReport]);

  useEffect(() => {
    if (selectedCenterId) return;
    const firstCenterId = centers[0]?.id;
    if (firstCenterId) setSelectedCenterId(firstCenterId);
  }, [centers, selectedCenterId]);

  useEffect(() => {
    setGroupDraft((prev) => ({ ...prev, centerId: selectedCenterId }));
  }, [selectedCenterId]);

  useEffect(() => {
    const p = clientProfileQuery.data;
    if (!p) {
      setPersonalMetaDraft(PERSONAL_META_EMPTY);
      return;
    }
    setPersonalMetaDraft((prev) => ({
      ...prev,
      painNote: p.painNote || "",
      goalNote: p.goalNote || "",
      surgeryHistory: p.surgeryHistory || "",
      beforeClassMemo: p.beforeClassMemo || "",
      afterClassMemo: p.afterClassMemo || "",
      nextLessonPlan: p.nextLessonPlan || ""
    }));
  }, [clientProfileQuery.data]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    const list = reportPhotosQuery.data || [];
    if (!list.length) {
      setPhotoObjectUrls({});
      return;
    }

    let cancelled = false;
    const created: string[] = [];

    const load = async () => {
      const entries = await Promise.all(
        list.map(async (p) => {
          try {
            const resp = await api.get<Blob>(p.imageUrl, { responseType: "blob" });
            const url = URL.createObjectURL(resp.data);
            created.push(url);
            return [p.id, url] as const;
          } catch {
            return [p.id, p.imageUrl] as const;
          }
        })
      );
      if (cancelled) {
        created.forEach((u) => {
          if (u.startsWith("blob:")) URL.revokeObjectURL(u);
        });
        return;
      }
      setPhotoObjectUrls(Object.fromEntries(entries));
    };

    load();
    return () => {
      cancelled = true;
      created.forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
    };
  }, [reportPhotosQuery.data]);

  useEffect(() => {
    const list = clientProgressPhotosQuery.data || [];
    if (!list.length) {
      setClientProgressPhotoUrls({});
      return;
    }

    let cancelled = false;
    const created: string[] = [];
    const load = async () => {
      const entries = await Promise.all(
        list.map(async (p) => {
          try {
            const resp = await api.get<Blob>(p.imageUrl, { responseType: "blob" });
            const url = URL.createObjectURL(resp.data);
            created.push(url);
            return [p.id, url] as const;
          } catch {
            return [p.id, p.imageUrl] as const;
          }
        })
      );
      if (cancelled) {
        created.forEach((u) => {
          if (u.startsWith("blob:")) URL.revokeObjectURL(u);
        });
        return;
      }
      setClientProgressPhotoUrls(Object.fromEntries(entries));
    };

    load();
    return () => {
      cancelled = true;
      created.forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
    };
  }, [clientProgressPhotosQuery.data]);

  const onCreateClient = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCenterId) {
      setNotice("먼저 센터를 추가/선택해주세요.");
      return;
    }
    setNotice("");
    const fd = new FormData(e.currentTarget);
    createClientMutation.mutate({
      name: String(fd.get("name") || ""),
      centerId: selectedCenterId || undefined,
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
      memo: String(fd.get("memo") || ""),
      startTime: String(fd.get("startTime") || "") || undefined
    });
  };

  const onUpdateClient = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    if (!clientEditDraft.name.trim()) {
      setNotice("회원 이름은 필수입니다.");
      return;
    }
    setNotice("");
    updateClientMutation.mutate({
      clientId: selectedMemberId,
      payload: {
        name: clientEditDraft.name.trim(),
        centerId: selectedCenterId || undefined,
        phone: clientEditDraft.phone || undefined,
        flagsNote: clientEditDraft.flagsNote || undefined,
        note: clientEditDraft.note || undefined
      }
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

  const onChangeSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSuppressHasReportWarning(false);
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

  const onUpdateReport = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReportId) return;
    setNotice("");
    updateReportMutation.mutate({
      reportId: selectedReportId,
      payload: reportEditDraft
    });
  };

  const onAddCenter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = newCenterName.trim();
    if (!name) return;
    createCenterMutation.mutate({ name });
  };

  const onSavePersonalMeta = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setNotice("먼저 회원을 선택해주세요.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const next: PersonalMeta = {
      painNote: String(fd.get("painNote") || ""),
      goalNote: String(fd.get("goalNote") || ""),
      surgeryHistory: String(fd.get("surgeryHistory") || ""),
      beforeClassMemo: String(fd.get("beforeClassMemo") || ""),
      afterClassMemo: String(fd.get("afterClassMemo") || ""),
      nextLessonPlan: String(fd.get("nextLessonPlan") || ""),
      homeworkGiven: String(fd.get("homeworkGiven") || ""),
      homeworkReminderAt: String(fd.get("homeworkReminderAt") || "")
    };
    setPersonalMetaDraft(next);
    upsertClientProfileMutation.mutate({
      clientId: selectedMemberId,
      payload: {
        painNote: next.painNote,
        goalNote: next.goalNote,
        surgeryHistory: next.surgeryHistory,
        beforeClassMemo: next.beforeClassMemo,
        afterClassMemo: next.afterClassMemo,
        nextLessonPlan: next.nextLessonPlan
      }
    });
    if (next.homeworkGiven) {
      createHomeworkMutation.mutate({
        clientId: selectedMemberId,
        content: next.homeworkGiven,
        remindAt: next.homeworkReminderAt || undefined
      });
    }
    setNotice("개인레슨 메모/숙제 정보를 저장했습니다.");
  };

  const onSaveGroupSequence = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCenterId) {
      setNotice("먼저 센터를 추가/선택해주세요.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const entry: Omit<GroupSequenceLog, "id" | "createdAt"> = {
      centerId: selectedCenterId,
      classDate: String(fd.get("classDate") || today),
      equipmentBrand: String(fd.get("equipmentBrand") || ""),
      springSetting: String(fd.get("springSetting") || ""),
      todaySequence: String(fd.get("todaySequence") || ""),
      nextSequence: String(fd.get("nextSequence") || ""),
      beforeMemo: String(fd.get("beforeMemo") || ""),
      afterMemo: String(fd.get("afterMemo") || ""),
      memberNotes: String(fd.get("memberNotes") || "")
    };
    createGroupSequenceMutation.mutate(entry);
    setGroupDraft({
      centerId: selectedCenterId,
      classDate: today,
      equipmentBrand: "",
      springSetting: "",
      todaySequence: "",
      nextSequence: "",
      beforeMemo: "",
      afterMemo: "",
      memberNotes: ""
    });
    setNotice("그룹 시퀀스 기록을 저장했습니다.");
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
    if (activeVoiceField === field && recognitionRef.current) {
      recognitionRef.current.stop();
      setActiveVoiceField(null);
      setNotice("음성 입력을 종료했습니다.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setActiveVoiceField(null);
    }

    const recognition = createSpeechRecognition();
    if (!recognition) {
      setNotice("이 브라우저는 음성 입력을 지원하지 않습니다. Chrome 최신 버전을 권장합니다.");
      return;
    }
    recognitionRef.current = recognition;
    setActiveVoiceField(field);
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
    recognition.onend = () => {
      recognitionRef.current = null;
      setActiveVoiceField((prev) => (prev === field ? null : prev));
    };
    recognition.start();
  };

  const onUploadPhoto = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReportId) return;
    const fileInput = e.currentTarget.querySelector<HTMLInputElement>("input[name='photo']");
    const file = fileInput?.files?.[0];
    if (!file) {
      setNotice("업로드할 사진을 선택해주세요.");
      return;
    }
    setNotice("");
    uploadPhotoMutation.mutate({ reportId: selectedReportId, file });
    e.currentTarget.reset();
  };

  const onUploadClientProgressPhoto = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setNotice("먼저 회원을 선택해주세요.");
      return;
    }
    const fileInput = e.currentTarget.querySelector<HTMLInputElement>("input[name='clientProgressPhoto']");
    const file = fileInput?.files?.[0];
    if (!file) {
      setNotice("업로드할 비포/애프터 사진을 선택해주세요.");
      return;
    }
    uploadClientProgressPhotoMutation.mutate({
      clientId: selectedMemberId,
      file,
      phase: progressPhotoPhase,
      note: progressPhotoNote || undefined,
      takenOn: progressPhotoTakenOn || undefined
    });
    e.currentTarget.reset();
    setProgressPhotoNote("");
  };

  const copyShareUrl = async () => {
    const target = sharePublicUrl || shareUrl;
    if (!target) return;
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(target);
      setCopyState("copied");
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
        setCopyState("copied");
        setNotice("공유 링크를 복사했습니다.");
      } catch {
        setCopyState("failed");
        setNotice("클립보드 복사에 실패했습니다.");
      }
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eef2f7_0,#f7f9fc_35%,#f2f4f8_100%)] p-4 md:p-8">
      <header className="mx-auto mb-6 flex w-full max-w-7xl items-center justify-between rounded-2xl border border-white/70 bg-white/70 p-4 shadow-lg backdrop-blur-md animate-rise">
        <div>
          <p className="font-['Fraunces'] text-2xl text-slate-900">수업 리포트 관리</p>
          <p className="text-sm text-slate-600">
            서비스 상태: {healthQuery.data?.status === "UP" ? "정상" : healthQuery.data?.status ? "점검 필요" : "확인 중"}
          </p>
        </div>
        <button className="btn" onClick={onLogout}>로그아웃</button>
      </header>

      {notice && (
        <section className="mx-auto mb-4 w-full max-w-7xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </section>
      )}

      <section className="mx-auto mb-4 grid w-full max-w-7xl gap-4 md:grid-cols-[1fr_auto]">
        <Card title="센터 / 탭">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select className="field max-w-xs" value={selectedCenterId} onChange={(e) => setSelectedCenterId(e.target.value)}>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <form className="flex items-center gap-2" onSubmit={onAddCenter}>
              <input className="field w-40" value={newCenterName} onChange={(e) => setNewCenterName(e.target.value)} placeholder="센터명 추가" />
              <button className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700" type="submit">추가</button>
            </form>
            <span className="text-xs text-slate-500">현재 센터: {selectedCenter?.name || "-"}</span>
          </div>
        </Card>

        <div className="flex items-center gap-2 self-end">
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm ${activeTab === "lesson" ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-300 text-slate-600"}`}
            onClick={() => setActiveTab("lesson")}
          >
            수업 관리(공통)
          </button>
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm ${activeTab === "member" ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-300 text-slate-600"}`}
            onClick={() => setActiveTab("member")}
          >
            회원 추적(개인 특화)
          </button>
        </div>
      </section>

      {activeTab === "lesson" ? (
      <section className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[360px_1fr]">
        <Card title="회원 목록">
          <div className="mb-2 flex gap-2">
            <input
              className="field"
              placeholder="이름/전화 검색"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
            <button className="rounded-lg border border-slate-300 px-2 text-slate-700" onClick={() => setShowMemberForm((v) => !v)}>
              {showMemberForm ? "닫기" : "회원 등록"}
            </button>
          </div>

          {showMemberForm && (
            <form className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-white/80 p-2" onSubmit={onCreateClient}>
              <p className="text-[11px] font-semibold text-slate-500">회원 신규 등록</p>
              <p className="text-[11px] text-slate-500">이름</p>
              <input name="name" className="field" placeholder="이름" required />
              <p className="text-[11px] text-slate-500">전화</p>
              <input name="phone" className="field" placeholder="전화" />
              <p className="text-[11px] text-slate-500">주의사항</p>
              <input name="flagsNote" className="field" placeholder="주의사항" />
              <p className="text-[11px] text-slate-500">메모</p>
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
                className={`rounded-lg border p-2 ${selectedMemberId === c.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white/80"}`}
              >
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.phone || "전화 없음"}</p>
              </li>
            ))}
          </ul>

          {selectedClient && (
            <div className="mt-3 rounded-lg border border-slate-300 bg-slate-100 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-slate-900">선택 회원 정보</p>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-700"
                  onClick={() => setShowMemberEditForm((v) => !v)}
                >
                  {showMemberEditForm ? "수정 취소" : "회원 정보 수정"}
                </button>
              </div>
              <DetailRow label="이름" value={selectedClient.name} />
              <DetailRow label="전화" value={selectedClient.phone || "-"} />
              <DetailRow label="주의사항" value={selectedClient.flagsNote || "-"} />
              <DetailRow label="메모" value={selectedClient.note || "-"} />
              <DetailRow label="리포트 수" value={String(reports.length)} />
              {showMemberEditForm && (
                <form className="mt-3 space-y-2 rounded-md border border-slate-300 bg-white/80 p-2" onSubmit={onUpdateClient}>
                  <p className="text-[11px] font-semibold text-slate-500">회원 정보 수정</p>
                  <p className="text-[11px] text-slate-500">이름</p>
                  <input
                    className="field"
                    value={clientEditDraft.name}
                    onChange={(e) => setClientEditDraft((p) => ({ ...p, name: e.target.value }))}
                    placeholder="이름"
                    required
                  />
                  <p className="text-[11px] text-slate-500">전화</p>
                  <input
                    className="field"
                    value={clientEditDraft.phone}
                    onChange={(e) => setClientEditDraft((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="전화"
                  />
                  <p className="text-[11px] text-slate-500">주의사항</p>
                  <input
                    className="field"
                    value={clientEditDraft.flagsNote}
                    onChange={(e) => setClientEditDraft((p) => ({ ...p, flagsNote: e.target.value }))}
                    placeholder="주의사항"
                  />
                  <p className="text-[11px] text-slate-500">메모</p>
                  <textarea
                    className="field min-h-16"
                    value={clientEditDraft.note}
                    onChange={(e) => setClientEditDraft((p) => ({ ...p, note: e.target.value }))}
                    placeholder="메모"
                  />
                  <button className="btn w-full" disabled={updateClientMutation.isPending}>
                    {updateClientMutation.isPending ? "수정중..." : "회원 정보 저장"}
                  </button>
                </form>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="세션 등록">
            <div className="mb-2 text-sm text-slate-600">
              선택 회원: <b>{selectedClient?.name || "없음"}</b>
            </div>
            <form className="grid gap-2 md:grid-cols-4" onSubmit={onCreateSession}>
              <div>
                <p className="mb-1 text-[11px] text-slate-500">수업 날짜</p>
                <input
                  name="date"
                  className="field"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <p className="mb-1 text-[11px] text-slate-500">수업 시작 시간</p>
                <div className="grid grid-cols-2 gap-2">
                  <select className="field" value={sessionStartHour} onChange={(e) => setSessionStartHour(e.target.value)}>
                    <option value="">시</option>
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <select className="field" value={sessionStartMinute} onChange={(e) => setSessionStartMinute(e.target.value)}>
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}분
                      </option>
                    ))}
                  </select>
                </div>
                <input type="hidden" name="startTime" value={sessionStartHour ? `${sessionStartHour}:${sessionStartMinute}` : ""} readOnly />
              </div>
              <div>
                <p className="mb-1 text-[11px] text-slate-500">수업 형태</p>
                <select name="type" className="field">
                  <option value="PERSONAL">개인</option>
                  <option value="GROUP">그룹</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <p className="mb-1 text-[11px] text-slate-500">수업 메모</p>
                <input name="memo" className="field" placeholder="수업 메모" />
              </div>
              <button className="btn md:col-span-4" disabled={createSessionMutation.isPending || !selectedMemberId}>
                {createSessionMutation.isPending ? "생성중..." : "세션 생성"}
              </button>
            </form>
          </Card>

          <Card title="시퀀스 기록 (개인/그룹 공통)">
            <p className="mb-2 text-xs text-slate-500">개인/그룹 모두 같은 시퀀스 기록을 사용하고, 수업 형태로 구분합니다.</p>
            <form className="grid gap-2 md:grid-cols-2" onSubmit={onSaveGroupSequence}>
              <div>
                <p className="mb-1 text-[11px] text-slate-500">수업 날짜</p>
                <input name="classDate" type="date" className="field" value={groupDraft.classDate} onChange={(e) => setGroupDraft((p) => ({ ...p, classDate: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-[11px] text-slate-500">기구 회사</p>
                <input name="equipmentBrand" className="field" value={groupDraft.equipmentBrand} onChange={(e) => setGroupDraft((p) => ({ ...p, equipmentBrand: e.target.value }))} placeholder="예: 한국필라테스 / 모션케어" />
              </div>
              <div className="md:col-span-2">
                <p className="mb-1 text-[11px] text-slate-500">스프링 세팅</p>
                <input name="springSetting" className="field" value={groupDraft.springSetting} onChange={(e) => setGroupDraft((p) => ({ ...p, springSetting: e.target.value }))} placeholder="예: Reformer red/red/blue" />
              </div>
              <div className="md:col-span-2">
                <p className="mb-1 text-[11px] text-slate-500">오늘 시퀀스</p>
                <textarea name="todaySequence" className="field min-h-16" value={groupDraft.todaySequence} onChange={(e) => setGroupDraft((p) => ({ ...p, todaySequence: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <p className="mb-1 text-[11px] text-slate-500">다음 시퀀스 계획</p>
                <textarea name="nextSequence" className="field min-h-16" value={groupDraft.nextSequence} onChange={(e) => setGroupDraft((p) => ({ ...p, nextSequence: e.target.value }))} />
              </div>
              <button className="btn md:col-span-2">시퀀스 저장</button>
            </form>
          </Card>

          <Card title="리포트 등록" className={newSessionCue ? "ring-2 ring-slate-300 animate-pulse" : ""}>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={showReportedSession} onChange={(e) => setShowReportedSession(e.target.checked)} />
                완료 세션도 보기
              </label>
              <button className="rounded-md border border-slate-300 px-2 py-1 text-slate-700" type="button" onClick={applyQuickDraft}>원클릭 초안</button>
            </div>
            {!showReportedSession && (
              <p className="mb-2 text-xs text-slate-500">완료된 세션은 기본 숨김입니다. 필요하면 `완료 세션도 보기`를 체크하세요.</p>
            )}

            <form className="space-y-2" onSubmit={onCreateReport}>
              <select className="field" value={selectedSessionId} onChange={(e) => onChangeSession(e.target.value)} required>
                <option value="">세션 선택</option>
                {sessionsForSelectedMember.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.date} / {s.type === "PERSONAL" ? "개인" : "그룹"} / {s.startTime || "시간 미입력"} / {toShort(s.memo || "없음", 18)} {s.hasReport ? "(리포트 있음)" : ""}
                  </option>
                ))}
              </select>

              <FieldWithVoice
                label="요약"
                value={draft.summaryItems}
                placeholder="요약"
                onChange={(v) => setDraft((p) => ({ ...p, summaryItems: v }))}
                onVoice={() => startVoiceInput("summaryItems")}
                recording={activeVoiceField === "summaryItems"}
              />
              <FieldWithVoice
                label="잘된 점"
                value={draft.strengthNote}
                placeholder="잘된 점"
                onChange={(v) => setDraft((p) => ({ ...p, strengthNote: v }))}
                onVoice={() => startVoiceInput("strengthNote")}
                recording={activeVoiceField === "strengthNote"}
              />
              <FieldWithVoice
                label="보완점"
                value={draft.improveNote}
                placeholder="보완점"
                onChange={(v) => setDraft((p) => ({ ...p, improveNote: v }))}
                onVoice={() => startVoiceInput("improveNote")}
                recording={activeVoiceField === "improveNote"}
              />
              <FieldWithVoice
                label="다음 목표"
                value={draft.nextGoal}
                placeholder="다음 목표"
                onChange={(v) => setDraft((p) => ({ ...p, nextGoal: v }))}
                onVoice={() => startVoiceInput("nextGoal")}
                recording={activeVoiceField === "nextGoal"}
              />

              <button className="btn w-full" disabled={createReportMutation.isPending || !selectedSessionId || !!selectedSession?.hasReport}>
                {createReportMutation.isPending ? "저장중..." : "리포트 저장"}
              </button>
            </form>

            {selectedSession?.hasReport && selectedSessionId !== lastSavedSessionId && !suppressHasReportWarning && (
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
                    className={`rounded-lg border p-2 ${selectedReportId === r.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white/80"}`}
                  >
                    <p className="font-medium text-slate-900">
                      수업: {formatSessionSummary(r)}
                    </p>
                    <p className="text-xs text-slate-500">작성일: {formatDateTime(r.createdAt)}</p>
                    <p className="text-xs text-slate-500">{toShort(r.summaryItems || "요약 없음", 46)}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="리포트 상세 / 공유">
              {!selectedReport && <p className="text-sm text-slate-500">왼쪽 목록에서 리포트를 선택하세요.</p>}
              {selectedReport && (
                <div className="space-y-2 text-xs">
                  <DetailRow label="수업" value={formatSessionSummary(selectedReport)} />
                  <DetailRow label="작성일" value={formatDateTime(selectedReport.createdAt)} />
                  <DetailRow label="요약" value={selectedReport.summaryItems || "-"} />
                  <DetailRow label="잘된 점" value={selectedReport.strengthNote || "-"} />
                  <DetailRow label="보완점" value={selectedReport.improveNote || "-"} />
                  <DetailRow label="다음 목표" value={selectedReport.nextGoal || "-"} />
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    onClick={() => setShowReportEditForm((v) => !v)}
                  >
                    {showReportEditForm ? "수정 취소" : "리포트 수정"}
                  </button>

                  {showReportEditForm && (
                    <form className="space-y-2 rounded-md border border-slate-300 bg-white/80 p-2" onSubmit={onUpdateReport}>
                      <p className="text-[11px] font-semibold text-slate-500">리포트 수정</p>
                      <p className="text-[11px] text-slate-500">요약</p>
                      <input
                        className="field"
                        value={reportEditDraft.summaryItems}
                        onChange={(e) => setReportEditDraft((p) => ({ ...p, summaryItems: e.target.value }))}
                        placeholder="요약"
                      />
                      <p className="text-[11px] text-slate-500">잘된 점</p>
                      <input
                        className="field"
                        value={reportEditDraft.strengthNote}
                        onChange={(e) => setReportEditDraft((p) => ({ ...p, strengthNote: e.target.value }))}
                        placeholder="잘된 점"
                      />
                      <p className="text-[11px] text-slate-500">보완점</p>
                      <input
                        className="field"
                        value={reportEditDraft.improveNote}
                        onChange={(e) => setReportEditDraft((p) => ({ ...p, improveNote: e.target.value }))}
                        placeholder="보완점"
                      />
                      <p className="text-[11px] text-slate-500">다음 목표</p>
                      <input
                        className="field"
                        value={reportEditDraft.nextGoal}
                        onChange={(e) => setReportEditDraft((p) => ({ ...p, nextGoal: e.target.value }))}
                        placeholder="다음 목표"
                      />
                      <button className="btn w-full" disabled={updateReportMutation.isPending}>
                        {updateReportMutation.isPending ? "수정중..." : "리포트 수정 저장"}
                      </button>
                    </form>
                  )}

                  <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-white/80 p-2">
                    <p className="text-[11px] font-semibold text-slate-600">사진 기록</p>
                    <form className="space-y-2" onSubmit={onUploadPhoto}>
                      <input name="photo" type="file" accept="image/*" className="field" />
                      <button className="btn w-full" disabled={uploadPhotoMutation.isPending}>
                        {uploadPhotoMutation.isPending ? "업로드중..." : "사진 업로드"}
                      </button>
                    </form>
                    <div className="grid grid-cols-3 gap-2">
                      {(reportPhotosQuery.data || []).map((p) => (
                        <button key={p.id} type="button" onClick={() => setSelectedPhotoPreview(photoObjectUrls[p.id] || p.imageUrl)} className="overflow-hidden rounded-md border border-slate-200">
                          <img src={photoObjectUrls[p.id] || p.imageUrl} alt={p.fileName} className="h-20 w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <form className="mt-2 space-y-2" onSubmit={onCreateShare}>
                    <label className="block text-xs font-medium text-slate-700" htmlFor="expireHours">
                      공유 만료시간(시간)
                    </label>
                    <input
                      id="expireHours"
                      name="expireHours"
                      className="field"
                      type="number"
                      min={1}
                      max={720}
                      defaultValue={72}
                      placeholder="예: 72 (3일)"
                    />
                    <p className="text-[11px] text-slate-500">입력한 시간 이후 링크가 자동 만료됩니다.</p>
                    <button className="btn w-full" disabled={createShareMutation.isPending || !selectedReportId}>
                      {createShareMutation.isPending ? "생성중..." : "공유 링크 생성"}
                    </button>
                  </form>

                  {sharePublicUrl && (
                    <div className="space-y-1">
                      <a className="block truncate text-sm text-slate-700 underline" href={sharePublicUrl} target="_blank" rel="noreferrer">
                        {sharePublicUrl}
                      </a>
                      <button
                        type="button"
                        className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                          copyState === "copied"
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : copyState === "failed"
                              ? "border-rose-400 bg-rose-50 text-rose-700"
                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                        onClick={copyShareUrl}
                      >
                        {copyState === "copying" ? "복사중..." : copyState === "copied" ? "복사됨" : copyState === "failed" ? "복사 실패" : "링크 복사"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </section>
        </div>
      </section>
      ) : (
      <section className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[320px_1fr]">
        <Card title="회원 선택">
          <input
            className="field mb-2"
            placeholder="이름/전화 검색"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
          <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1 text-sm">
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
                className={`rounded-lg border p-2 ${selectedMemberId === c.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white/80"}`}
              >
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.phone || "전화 없음"}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="회원 추적(개인 특화)">
          <div className="mb-2 text-sm text-slate-600">
            선택 회원: <b>{selectedClient?.name || "없음"}</b>
          </div>
          <form key={selectedMemberId || "no-client"} className="grid gap-2 md:grid-cols-2" onSubmit={onSavePersonalMeta}>
            <div>
              <p className="mb-1 text-[11px] text-slate-500">아픈 부위/증상</p>
              <textarea name="painNote" className="field min-h-16" value={personalMetaDraft.painNote} onChange={(e) => setPersonalMetaDraft((p) => ({ ...p, painNote: e.target.value }))} />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-500">목표</p>
              <textarea name="goalNote" className="field min-h-16" value={personalMetaDraft.goalNote} onChange={(e) => setPersonalMetaDraft((p) => ({ ...p, goalNote: e.target.value }))} />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-500">수술 이력</p>
              <textarea name="surgeryHistory" className="field min-h-16" value={personalMetaDraft.surgeryHistory} onChange={(e) => setPersonalMetaDraft((p) => ({ ...p, surgeryHistory: e.target.value }))} />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-500">수업 전 메모</p>
              <textarea name="beforeClassMemo" className="field min-h-16" value={personalMetaDraft.beforeClassMemo} onChange={(e) => setPersonalMetaDraft((p) => ({ ...p, beforeClassMemo: e.target.value }))} />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-500">수업 후 기록</p>
              <textarea name="afterClassMemo" className="field min-h-16" value={personalMetaDraft.afterClassMemo} onChange={(e) => setPersonalMetaDraft((p) => ({ ...p, afterClassMemo: e.target.value }))} />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-500">다음 레슨 계획</p>
              <textarea name="nextLessonPlan" className="field min-h-16" value={personalMetaDraft.nextLessonPlan} onChange={(e) => setPersonalMetaDraft((p) => ({ ...p, nextLessonPlan: e.target.value }))} />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-500">이번 숙제</p>
              <input name="homeworkGiven" className="field" value={personalMetaDraft.homeworkGiven} onChange={(e) => setPersonalMetaDraft((p) => ({ ...p, homeworkGiven: e.target.value }))} />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-500">숙제 알림 시각</p>
              <input name="homeworkReminderAt" type="datetime-local" className="field" value={personalMetaDraft.homeworkReminderAt} onChange={(e) => setPersonalMetaDraft((p) => ({ ...p, homeworkReminderAt: e.target.value }))} />
            </div>
            <button className="btn md:col-span-2" disabled={!selectedMemberId}>회원 추적 저장</button>
          </form>
        </Card>
      </section>
      )}

      {selectedPhotoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="button"
          tabIndex={0}
          onClick={() => setSelectedPhotoPreview("")}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setSelectedPhotoPreview("");
          }}
        >
          <img src={selectedPhotoPreview} alt="report photo preview" className="max-h-[90vh] max-w-[90vw] rounded-xl border border-white/40" />
        </div>
      )}
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

function FieldWithVoice({
  label,
  value,
  placeholder,
  onChange,
  onVoice,
  recording
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onVoice: () => void;
  recording: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] text-slate-500">{label}</p>
      <div className="flex gap-2">
      <input value={value} onChange={(e) => onChange(e.target.value)} className="field" placeholder={placeholder} />
      <button
        type="button"
        className={`rounded-lg border px-2 text-xs ${recording ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-300 text-slate-700"}`}
        onClick={onVoice}
      >
        {recording ? "녹음중" : "음성"}
      </button>
      </div>
    </div>
  );
}

function createSpeechRecognition(): BrowserSpeechRecognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
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

function toShort(value: string, max = 16) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function formatSessionSummary(report: {
  sessionDate?: string;
  sessionStartTime?: string;
  sessionType?: "PERSONAL" | "GROUP" | string;
}) {
  const date = report.sessionDate || "날짜 미입력";
  const time = report.sessionStartTime || "시간 미입력";
  const type = report.sessionType === "PERSONAL" ? "개인" : report.sessionType === "GROUP" ? "그룹" : "수업유형 미입력";
  return `${date} ${time} ${type}`;
}
