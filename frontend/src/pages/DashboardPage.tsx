import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCenter,
  createClient,
  createClientHomework,
  createGroupSequenceTemplate,
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
  listGroupSequenceTemplates,
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
  centerId: string;
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
  sessionId?: string;
  lessonType: "PERSONAL" | "GROUP";
  classDate: string;
  equipmentType?: string;
  equipmentBrand?: string;
  sessionStartTime?: string;
  springSetting?: string;
  todaySequence?: string;
  nextSequence?: string;
  beforeMemo?: string;
  afterMemo?: string;
  memberNotes?: string;
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
const CUSTOM_TEXT = "__CUSTOM_TEXT__";
const EQUIPMENT_OPTIONS: Array<{ value: string; label: string; hasSpring: boolean }> = [
  { value: "REFORMER", label: "리포머", hasSpring: true },
  { value: "CADILLAC", label: "캐딜락", hasSpring: true },
  { value: "TOWER", label: "타워", hasSpring: true },
  { value: "SPRING_BOARD", label: "스프링보드", hasSpring: true },
  { value: "WUNDA_CHAIR", label: "운다 체어", hasSpring: true },
  { value: "LADDER_BARREL", label: "래더 배럴", hasSpring: false },
  { value: "SPINE_CORRECTOR", label: "스파인 코렉터", hasSpring: false },
  { value: "ARC_BARREL", label: "아크 배럴", hasSpring: false },
  { value: "MAT", label: "매트", hasSpring: false }
];
const DEFAULT_BRANDS = ["한국필라테스", "모션케어"];
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
  const [selectedTimelineSessionId, setSelectedTimelineSessionId] = useState("");
  const [detailPanelMode, setDetailPanelMode] = useState<"report" | "sequence">("report");
  const [activeTab, setActiveTab] = useState<"lesson" | "member">("lesson");
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [newCenterName, setNewCenterName] = useState("");
  const [lessonTypeFilter, setLessonTypeFilter] = useState<"ALL" | "PERSONAL" | "GROUP">("ALL");
  const [sessionStartHour, setSessionStartHour] = useState("");
  const [sessionStartMinute, setSessionStartMinute] = useState("00");
  const [showReportedSession, setShowReportedSession] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showCenterForm, setShowCenterForm] = useState(false);
  const [activeLessonForm, setActiveLessonForm] = useState<"session" | "work" | null>(null);
  const [activeWorkPane, setActiveWorkPane] = useState<"sequence" | "report">("sequence");
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
  const [clientEditDraft, setClientEditDraft] = useState<ClientEditDraft>({ name: "", centerId: "", phone: "", flagsNote: "", note: "" });
  const [reportEditDraft, setReportEditDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [activeVoiceField, setActiveVoiceField] = useState<keyof ReportDraft | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState("");
  const [selectedSequenceDetail, setSelectedSequenceDetail] = useState<GroupSequenceLog | null>(null);
  const [pendingReportPhotoFile, setPendingReportPhotoFile] = useState<File | null>(null);
  const [sequenceLoadBackup, setSequenceLoadBackup] = useState<Pick<GroupSequenceLog, "equipmentType" | "equipmentBrand" | "springSetting" | "todaySequence" | "nextSequence"> | null>(null);
  const [flashReportSessionId, setFlashReportSessionId] = useState("");
  const [flashSequenceSessionId, setFlashSequenceSessionId] = useState("");
  const [progressPhotoPhase, setProgressPhotoPhase] = useState<"BEFORE" | "AFTER" | "ETC">("ETC");
  const [progressPhotoNote, setProgressPhotoNote] = useState("");
  const [progressPhotoTakenOn, setProgressPhotoTakenOn] = useState(today);
  const [photoObjectUrls, setPhotoObjectUrls] = useState<Record<string, string>>({});
  const [clientProgressPhotoUrls, setClientProgressPhotoUrls] = useState<Record<string, string>>({});
  const [personalMetaDraft, setPersonalMetaDraft] = useState<PersonalMeta>(PERSONAL_META_EMPTY);
  const [groupDraft, setGroupDraft] = useState<Omit<GroupSequenceLog, "id" | "createdAt">>({
    centerId: selectedCenterId,
    sessionId: "",
    lessonType: "GROUP",
    classDate: today,
    equipmentType: "",
    equipmentBrand: "",
    springSetting: "",
    todaySequence: "",
    nextSequence: "",
    beforeMemo: "",
    afterMemo: "",
    memberNotes: ""
  });
  const [templateTitle, setTemplateTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [customEquipmentHasSpring, setCustomEquipmentHasSpring] = useState(true);
  const [isCustomEquipmentInput, setIsCustomEquipmentInput] = useState(false);
  const [sequenceBrandMode, setSequenceBrandMode] = useState<"preset" | "custom">("preset");
  const [sequenceSpringMode, setSequenceSpringMode] = useState<"preset" | "custom">("preset");
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
    queryKey: ["group-sequences", selectedCenterId, lessonTypeFilter],
    queryFn: () => listGroupSequences(selectedCenterId, lessonTypeFilter === "ALL" ? undefined : lessonTypeFilter),
    enabled: !!selectedCenterId
  });
  const groupSequenceTemplatesQuery = useQuery({
    queryKey: ["group-sequence-templates", selectedCenterId, groupDraft.lessonType],
    queryFn: () => listGroupSequenceTemplates(selectedCenterId, groupDraft.lessonType),
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
  const memberListRowHeight = 40;
  const memberListMaxVisible = 6;
  const memberListHeight = Math.min(filteredClients.length, memberListMaxVisible) * memberListRowHeight || memberListRowHeight;

  const selectedClient = useMemo(() => clients.find((c) => c.id === selectedMemberId) || null, [clients, selectedMemberId]);
  const selectedClientCenterName = useMemo(
    () => centers.find((x) => x.id === selectedClient?.centerId)?.name || "-",
    [centers, selectedClient?.centerId]
  );

  const sessionsForSelectedMember = useMemo(() => {
    const rows = sessionsQuery.data || [];
    const byMember = rows.filter((s) => s.clientId === selectedMemberId);
    const byType = lessonTypeFilter === "ALL" ? byMember : byMember.filter((s) => s.type === lessonTypeFilter);
    return showReportedSession ? byType : byType.filter((s) => !s.hasReport);
  }, [sessionsQuery.data, selectedMemberId, showReportedSession, lessonTypeFilter]);
  const timelineSessions = useMemo(() => {
    const rows = sessionsQuery.data || [];
    const byMember = rows.filter((s) => s.clientId === selectedMemberId);
    const byType = lessonTypeFilter === "ALL" ? byMember : byMember.filter((s) => s.type === lessonTypeFilter);
    return [...byType].sort((a, b) => {
      const ak = `${a.date} ${a.startTime || "00:00"} ${a.createdAt}`;
      const bk = `${b.date} ${b.startTime || "00:00"} ${b.createdAt}`;
      return ak < bk ? 1 : -1;
    });
  }, [sessionsQuery.data, selectedMemberId, lessonTypeFilter]);

  const selectedSession = useMemo(
    () => (sessionsQuery.data || []).find((s) => s.id === selectedSessionId) || null,
    [sessionsQuery.data, selectedSessionId]
  );
  const sessionById = useMemo(
    () => Object.fromEntries((sessionsQuery.data || []).map((s) => [s.id, s])),
    [sessionsQuery.data]
  );

  const reports = useMemo(() => reportsQuery.data || [], [reportsQuery.data]);
  const selectedReport = useMemo(() => reports.find((r) => r.id === selectedReportId) || null, [reports, selectedReportId]);
  const reportBySessionId = useMemo(
    () => Object.fromEntries(reports.map((r) => [r.sessionId, r])),
    [reports]
  );
  const sequenceBySessionId = useMemo(
    () => Object.fromEntries((groupSequencesQuery.data || []).filter((g) => !!g.sessionId).map((g) => [g.sessionId as string, g])),
    [groupSequencesQuery.data]
  );
  const sequenceBrandOptions = useMemo(() => {
    const fromLogs = (groupSequencesQuery.data || []).map((g) => (g.equipmentBrand || "").trim()).filter(Boolean);
    return Array.from(new Set([...DEFAULT_BRANDS, ...fromLogs]));
  }, [groupSequencesQuery.data]);
  const springSettingOptions = useMemo(() => {
    const fromLogs = (groupSequencesQuery.data || [])
      .filter((g) => {
        if (!(g.springSetting || "").trim()) return false;
        if (groupDraft.equipmentType && (g.equipmentType || "") !== groupDraft.equipmentType) return false;
        if (groupDraft.equipmentBrand && (g.equipmentBrand || "") !== groupDraft.equipmentBrand) return false;
        return true;
      })
      .map((g) => (g.springSetting || "").trim())
      .filter(Boolean);
    const fromTemplates = (groupSequenceTemplatesQuery.data || [])
      .filter((t) => {
        if (!(t.springSetting || "").trim()) return false;
        if (groupDraft.equipmentBrand && (t.equipmentBrand || "") !== groupDraft.equipmentBrand) return false;
        return true;
      })
      .map((t) => (t.springSetting || "").trim())
      .filter(Boolean);
    return Array.from(new Set([...fromLogs, ...fromTemplates]));
  }, [groupSequencesQuery.data, groupSequenceTemplatesQuery.data, groupDraft.equipmentType, groupDraft.equipmentBrand]);
  const latestReusableSequence = useMemo(() => {
    const rows = (groupSequencesQuery.data || []).filter((g) => {
      if (groupDraft.sessionId && g.sessionId === groupDraft.sessionId) return false;
      if (g.lessonType !== groupDraft.lessonType) return false;
      if (groupDraft.equipmentType && (g.equipmentType || "") !== groupDraft.equipmentType) return false;
      if (groupDraft.equipmentBrand && (g.equipmentBrand || "") !== groupDraft.equipmentBrand) return false;
      return !!(g.todaySequence || g.nextSequence || g.springSetting);
    });
    if (!rows.length) return null;
    return [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  }, [groupSequencesQuery.data, groupDraft.sessionId, groupDraft.lessonType, groupDraft.equipmentType, groupDraft.equipmentBrand]);
  const selectedEquipmentMeta = useMemo(
    () => EQUIPMENT_OPTIONS.find((o) => o.value === groupDraft.equipmentType) || null,
    [groupDraft.equipmentType]
  );
  const isCustomEquipment = isCustomEquipmentInput;
  const equipmentSelectValue = isCustomEquipmentInput ? CUSTOM_TEXT : selectedEquipmentMeta ? selectedEquipmentMeta.value : "";
  const shouldShowSpringSetting = selectedEquipmentMeta ? selectedEquipmentMeta.hasSpring : isCustomEquipment ? customEquipmentHasSpring : false;

  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients", selectedCenterId] });
      setSelectedMemberId(data.id);
      setMemberSearch("");
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
      setShowCenterForm(false);
      setNotice("센터가 추가되었습니다.");
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sessions-with-report", sessionDate] });
      setSelectedSessionId(data.id);
      setGroupDraft((prev) => ({
        ...prev,
        sessionId: data.id,
        lessonType: data.type,
        classDate: data.date
      }));
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
      if (data.centerId && data.centerId !== selectedCenterId) {
        setSelectedCenterId(data.centerId);
      }
      setSelectedMemberId(data.id);
      setShowMemberEditForm(false);
      setNotice("회원 정보(센터 포함)가 수정되었습니다.");
    }
  });

  const createReportMutation = useMutation({
    mutationFn: createReport,
    onSuccess: (data) => {
      setSelectedMemberId(data.clientId);
      qc.setQueryData(["reports", data.clientId], (prev: unknown) => {
        const rows = Array.isArray(prev) ? (prev as Array<{ id: string }>) : [];
        const next = [data, ...rows.filter((r) => r.id !== data.id)];
        return next.slice(0, 20);
      });
      qc.invalidateQueries({ queryKey: ["reports", data.clientId] });
      qc.invalidateQueries({ queryKey: ["sessions-with-report", sessionDate] });
      qc.refetchQueries({ queryKey: ["reports", data.clientId] });
      setSelectedReportId(data.id);
      setDetailPanelMode("report");
      setLastSavedSessionId(data.sessionId);
      setSuppressHasReportWarning(true);
      setFlashReportSessionId(data.sessionId);
      setActiveLessonForm(null);
      if (pendingReportPhotoFile) {
        uploadPhotoMutation.mutate({ reportId: data.id, file: pendingReportPhotoFile });
        setPendingReportPhotoFile(null);
      }
      setNotice("리포트 저장 완료.");
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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["report-photos", vars.reportId] });
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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["group-sequences", selectedCenterId], exact: false });
      if (data.sessionId) {
        setSelectedTimelineSessionId(data.sessionId);
        setSelectedSessionId(data.sessionId);
        setFlashSequenceSessionId(data.sessionId);
      }
      setSelectedSequenceDetail(data as GroupSequenceLog);
      setDetailPanelMode("sequence");
      setActiveLessonForm(null);
      setSequenceLoadBackup(null);
      setNotice("시퀀스를 저장했습니다.");
    }
  });
  const createGroupSequenceTemplateMutation = useMutation({
    mutationFn: createGroupSequenceTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-sequence-templates", selectedCenterId, groupDraft.lessonType] });
      setTemplateTitle("");
      setNotice("시퀀스 템플릿을 저장했습니다.");
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
    if (!flashReportSessionId) return;
    const t = setTimeout(() => setFlashReportSessionId(""), 1800);
    return () => clearTimeout(t);
  }, [flashReportSessionId]);

  useEffect(() => {
    if (!flashSequenceSessionId) return;
    const t = setTimeout(() => setFlashSequenceSessionId(""), 1800);
    return () => clearTimeout(t);
  }, [flashSequenceSessionId]);

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
    if (!selectedSessionId) return;
    if (groupDraft.sessionId) return;
    const session = (sessionsQuery.data || []).find((s) => s.id === selectedSessionId);
    if (!session) return;
    setGroupDraft((prev) => ({
      ...prev,
      sessionId: session.id,
      lessonType: session.type,
      classDate: session.date
    }));
  }, [selectedSessionId, groupDraft.sessionId, sessionsQuery.data]);

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
      setClientEditDraft({ name: "", centerId: "", phone: "", flagsNote: "", note: "" });
      return;
    }
    setClientEditDraft({
      name: selectedClient.name || "",
      centerId: selectedClient.centerId || selectedCenterId || "",
      phone: selectedClient.phone || "",
      flagsNote: selectedClient.flagsNote || "",
      note: selectedClient.note || ""
    });
  }, [selectedClient, selectedCenterId]);

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
    if (!selectedTemplateId) return;
    const t = (groupSequenceTemplatesQuery.data || []).find((x) => x.id === selectedTemplateId);
    if (!t) return;
    setGroupDraft((prev) => ({
      ...prev,
      equipmentBrand: t.equipmentBrand || "",
      springSetting: t.springSetting || "",
      todaySequence: t.sequenceBody || prev.todaySequence
    }));
  }, [selectedTemplateId, groupSequenceTemplatesQuery.data]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedPhotoPreview) setSelectedPhotoPreview("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPhotoPreview]);

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
        centerId: clientEditDraft.centerId || selectedCenterId || undefined,
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
    const session = (sessionsQuery.data || []).find((s) => s.id === sessionId);
    if (session) {
      setGroupDraft((prev) => ({
        ...prev,
        sessionId: session.id,
        lessonType: session.type,
        classDate: session.date
      }));
    }
  };

  const onToggleMember = (memberId: string) => {
    setSelectedMemberId((prev) => (prev === memberId ? "" : memberId));
  };

  const onToggleReport = (reportId: string) => {
    setSelectedReportId((prev) => {
      const next = prev === reportId ? "" : reportId;
      if (next) setDetailPanelMode("report");
      return next;
    });
  };

  const onSelectTimelineSession = (sessionId: string) => {
    const isSame = selectedTimelineSessionId === sessionId;
    setSelectedTimelineSessionId(isSame ? "" : sessionId);
    setSelectedSessionId(isSame ? "" : sessionId);
    setSuppressHasReportWarning(false);
    if (isSame) {
      setSelectedReportId("");
      setSelectedSequenceDetail(null);
      return;
    }
    const report = reportBySessionId[sessionId];
    const seq = sequenceBySessionId[sessionId];
    setSelectedReportId(report?.id || "");
    if (report) {
      setDetailPanelMode("report");
    } else if (seq) {
      setSelectedSequenceDetail(seq as GroupSequenceLog);
      setDetailPanelMode("sequence");
    }
  };

  const onTimelineReportAction = (sessionId: string, report?: { id: string } | null) => {
    if (report?.id && selectedTimelineSessionId === sessionId && detailPanelMode === "report" && selectedReportId === report.id) {
      setSelectedTimelineSessionId("");
      setSelectedSessionId("");
      setSelectedReportId("");
      setSelectedSequenceDetail(null);
      return;
    }
    setSelectedTimelineSessionId(sessionId);
    setSelectedSessionId(sessionId);
    if (report?.id) {
      setSelectedReportId(report.id);
      setSelectedSequenceDetail(null);
      setDetailPanelMode("report");
      return;
    }
    setActiveLessonForm("work");
    setActiveWorkPane("report");
    setNotice("이 세션의 리포트를 작성하세요.");
  };

  const onTimelineSequenceAction = (sessionId: string, sequence?: GroupSequenceLog | null) => {
    if (sequence && selectedTimelineSessionId === sessionId && detailPanelMode === "sequence" && selectedSequenceDetail?.id === sequence.id) {
      setSelectedTimelineSessionId("");
      setSelectedSessionId("");
      setSelectedSequenceDetail(null);
      setSelectedReportId("");
      return;
    }
    setSelectedTimelineSessionId(sessionId);
    setSelectedSessionId(sessionId);
    if (sequence) {
      setSelectedSequenceDetail(sequence);
      setSelectedReportId("");
      setDetailPanelMode("sequence");
      return;
    }
    const session = (sessionsQuery.data || []).find((s) => s.id === sessionId);
    setActiveLessonForm("work");
    setActiveWorkPane("sequence");
    if (session) {
      setGroupDraft((prev) => ({
        ...prev,
        sessionId: session.id,
        lessonType: session.type,
        classDate: session.date
      }));
    }
    setNotice("이 세션의 시퀀스를 기록하세요.");
  };

  const onChangeSequenceSession = (sessionId: string) => {
    const session = (sessionsQuery.data || []).find((s) => s.id === sessionId);
    if (!session) {
      setGroupDraft((prev) => ({ ...prev, sessionId: "" }));
      return;
    }
    setGroupDraft((prev) => ({
      ...prev,
      sessionId: session.id,
      lessonType: session.type,
      classDate: session.date
    }));
  };

  const applyLatestSequence = () => {
    if (!latestReusableSequence) {
      setNotice("재사용할 이전 시퀀스가 없습니다.");
      return;
    }
    setSequenceLoadBackup({
      equipmentType: groupDraft.equipmentType,
      equipmentBrand: groupDraft.equipmentBrand,
      springSetting: groupDraft.springSetting,
      todaySequence: groupDraft.todaySequence,
      nextSequence: groupDraft.nextSequence
    });
    setGroupDraft((prev) => ({
      ...prev,
      equipmentType: prev.equipmentType || latestReusableSequence.equipmentType || "",
      equipmentBrand: prev.equipmentBrand || latestReusableSequence.equipmentBrand || "",
      springSetting: latestReusableSequence.springSetting || "",
      todaySequence: latestReusableSequence.todaySequence || "",
      nextSequence: latestReusableSequence.nextSequence || ""
    }));
    setNotice("이전 시퀀스를 불러왔습니다. 필요한 부분만 수정 후 저장하세요.");
  };

  const cancelApplyPreviousSequence = () => {
    if (!sequenceLoadBackup) return;
    setGroupDraft((prev) => ({
      ...prev,
      equipmentType: sequenceLoadBackup.equipmentType || "",
      equipmentBrand: sequenceLoadBackup.equipmentBrand || "",
      springSetting: sequenceLoadBackup.springSetting || "",
      todaySequence: sequenceLoadBackup.todaySequence || "",
      nextSequence: sequenceLoadBackup.nextSequence || ""
    }));
    setSequenceLoadBackup(null);
    setNotice("이전 시퀀스 불러오기를 취소했습니다.");
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
    const linkedSession = groupDraft.sessionId ? (sessionsQuery.data || []).find((s) => s.id === groupDraft.sessionId) : null;
    const entry: Omit<GroupSequenceLog, "id" | "createdAt"> = {
      centerId: selectedCenterId,
      sessionId: groupDraft.sessionId || undefined,
      lessonType: linkedSession?.type || groupDraft.lessonType,
      classDate: linkedSession?.date || String(fd.get("classDate") || today),
      equipmentType: groupDraft.equipmentType || undefined,
      equipmentBrand: groupDraft.equipmentBrand,
      springSetting: groupDraft.springSetting,
      todaySequence: String(fd.get("todaySequence") || ""),
      nextSequence: String(fd.get("nextSequence") || ""),
      beforeMemo: String(fd.get("beforeMemo") || ""),
      afterMemo: String(fd.get("afterMemo") || ""),
      memberNotes: String(fd.get("memberNotes") || "")
    };
    createGroupSequenceMutation.mutate(entry);
    setGroupDraft({
      centerId: selectedCenterId,
      sessionId: groupDraft.sessionId,
      lessonType: linkedSession?.type || groupDraft.lessonType,
      classDate: linkedSession?.date || today,
      equipmentType: groupDraft.equipmentType,
      equipmentBrand: "",
      springSetting: "",
      todaySequence: "",
      nextSequence: "",
      beforeMemo: "",
      afterMemo: "",
      memberNotes: ""
    });
  };

  const onChangeEquipment = (next: string) => {
    if (!next) {
      setIsCustomEquipmentInput(false);
      setGroupDraft((p) => ({ ...p, equipmentType: "", equipmentBrand: "", springSetting: "" }));
      return;
    }
    if (next === CUSTOM_TEXT) {
      setIsCustomEquipmentInput(true);
      setGroupDraft((p) => ({ ...p, equipmentType: selectedEquipmentMeta ? "" : p.equipmentType, springSetting: customEquipmentHasSpring ? p.springSetting : "" }));
      return;
    }
    setIsCustomEquipmentInput(false);
    const meta = EQUIPMENT_OPTIONS.find((o) => o.value === next);
    setGroupDraft((p) => ({
      ...p,
      equipmentType: next,
      springSetting: meta?.hasSpring ? p.springSetting : ""
    }));
  };

  const onSaveSequenceTemplate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCenterId) {
      setNotice("먼저 센터를 선택해주세요.");
      return;
    }
    const title = templateTitle.trim();
    if (!title) {
      setNotice("템플릿 제목을 입력해주세요.");
      return;
    }
    createGroupSequenceTemplateMutation.mutate({
      centerId: selectedCenterId,
      lessonType: groupDraft.lessonType,
      title,
      equipmentBrand: groupDraft.equipmentBrand || undefined,
      springSetting: groupDraft.springSetting || undefined,
      sequenceBody: groupDraft.todaySequence || undefined
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
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {centers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCenterId(c.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${selectedCenterId === c.id ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-300 text-slate-600"}`}
                >
                  {c.name}
                </button>
              ))}
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700"
                onClick={() => setShowCenterForm((v) => !v)}
              >
                {showCenterForm ? "취소" : "센터 추가"}
              </button>
            </div>
            {showCenterForm && (
              <form className="flex items-center gap-2" onSubmit={onAddCenter}>
                <input className="field w-44" value={newCenterName} onChange={(e) => setNewCenterName(e.target.value)} placeholder="센터명" />
                <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700" type="submit">추가</button>
              </form>
            )}
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
      <section className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[300px_1fr]">
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

          <VirtualList
            items={filteredClients}
            height={memberListHeight}
            rowHeight={memberListRowHeight}
            renderRow={(c) => (
              <button
                type="button"
                onClick={() => onToggleMember(c.id)}
                className={`w-full rounded-lg border px-2 py-1 text-left ${selectedMemberId === c.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white/80"}`}
              >
                <p className="text-sm text-slate-900">
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{c.phone || "전화 없음"}</span>
                </p>
              </button>
            )}
            getKey={(c) => c.id}
          />

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
              <DetailRow label="센터" value={selectedClientCenterName} />
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
                  <p className="text-[11px] text-slate-500">센터 이동</p>
                  <select
                    className="field"
                    value={clientEditDraft.centerId}
                    onChange={(e) => setClientEditDraft((p) => ({ ...p, centerId: e.target.value }))}
                  >
                    <option value="">센터 선택</option>
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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
          <Card>
            <div className="flex gap-2 text-sm">
              <button type="button" className={`rounded-md border px-3 py-1 ${lessonTypeFilter === "ALL" ? "border-slate-400 bg-slate-100" : "border-slate-300"}`} onClick={() => setLessonTypeFilter("ALL")}>전체</button>
              <button type="button" className={`rounded-md border px-3 py-1 ${lessonTypeFilter === "PERSONAL" ? "border-slate-400 bg-slate-100" : "border-slate-300"}`} onClick={() => setLessonTypeFilter("PERSONAL")}>개인</button>
              <button type="button" className={`rounded-md border px-3 py-1 ${lessonTypeFilter === "GROUP" ? "border-slate-400 bg-slate-100" : "border-slate-300"}`} onClick={() => setLessonTypeFilter("GROUP")}>그룹</button>
            </div>
          </Card>

          <Card>
            <div className="mb-2 text-sm text-slate-600">
              선택 회원: <b>{selectedClient?.name || "없음"}</b>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm ${activeLessonForm === "session" ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-300 text-slate-700"}`}
                disabled={!selectedMemberId}
                onClick={() => setActiveLessonForm((prev) => (prev === "session" ? null : "session"))}
              >
                세션 등록
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm ${activeLessonForm === "work" && activeWorkPane === "sequence" ? "border-cyan-300 bg-cyan-50 text-cyan-700" : "border-slate-300 text-slate-700"}`}
                onClick={() => {
                  setActiveLessonForm((prev) => (prev === "work" ? null : "work"));
                  setActiveWorkPane("sequence");
                }}
              >
                시퀀스 기록
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm ${activeLessonForm === "work" && activeWorkPane === "report" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-700"}`}
                disabled={!selectedMemberId}
                onClick={() => {
                  setActiveLessonForm((prev) => (prev === "work" ? null : "work"));
                  setActiveWorkPane("report");
                }}
              >
                리포트 등록
              </button>
            </div>

            {activeLessonForm === "session" && (
              <form className="mt-3 grid gap-2 border-t border-slate-200 pt-3 md:grid-cols-4" onSubmit={onCreateSession}>
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
            )}

            {activeLessonForm === "work" && (
              <div className="mt-3 border-t border-slate-200 pt-3">
              {activeWorkPane === "sequence" && (
              <section className="space-y-2 rounded-lg border border-cyan-200 bg-cyan-50/40 p-2">
                <p className="text-xs font-semibold text-cyan-800">시퀀스 기록</p>
                <form className="grid gap-2 md:grid-cols-2" onSubmit={onSaveGroupSequence}>
                <div className="md:col-span-2">
                  <p className="mb-1 text-[11px] text-slate-500">연결 세션 (선택 시 수업형태 자동)</p>
                  <select className="field" value={groupDraft.sessionId || ""} onChange={(e) => onChangeSequenceSession(e.target.value)}>
                    <option value="">세션 선택 안함</option>
                    {(sessionsQuery.data || [])
                      .filter((s) => !selectedMemberId || s.clientId === selectedMemberId)
                      .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.date} / {s.startTime || "시간 미입력"} / {s.type === "PERSONAL" ? "개인" : "그룹"} / {toShort(s.memo || "메모 없음", 18)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-slate-500">수업 형태</p>
                  <select
                    className="field"
                    value={groupDraft.lessonType}
                    disabled={!!groupDraft.sessionId}
                    onChange={(e) => setGroupDraft((p) => ({ ...p, lessonType: e.target.value as "PERSONAL" | "GROUP" }))}
                  >
                    <option value="PERSONAL">개인</option>
                    <option value="GROUP">그룹</option>
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-slate-500">수업 날짜</p>
                  <input name="classDate" type="date" className="field" value={groupDraft.classDate} onChange={(e) => setGroupDraft((p) => ({ ...p, classDate: e.target.value }))} />
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-slate-500">기구 종류</p>
                  <select className="field" value={equipmentSelectValue} onChange={(e) => onChangeEquipment(e.target.value)}>
                    <option value="">선택</option>
                    {EQUIPMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                    <option value={CUSTOM_TEXT}>직접 입력</option>
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-slate-500">기구 브랜드</p>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    {sequenceBrandMode === "preset" ? (
                      <select
                        className="field"
                        value={sequenceBrandOptions.includes(groupDraft.equipmentBrand || "") ? groupDraft.equipmentBrand || "" : ""}
                        onChange={(e) => setGroupDraft((p) => ({ ...p, equipmentBrand: e.target.value }))}
                      >
                        <option value="">선택</option>
                        {sequenceBrandOptions.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="field"
                        value={groupDraft.equipmentBrand || ""}
                        onChange={(e) => setGroupDraft((p) => ({ ...p, equipmentBrand: e.target.value }))}
                        placeholder="브랜드 직접 입력"
                      />
                    )}
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 text-xs text-slate-700"
                      onClick={() => setSequenceBrandMode((m) => (m === "preset" ? "custom" : "preset"))}
                    >
                      {sequenceBrandMode === "preset" ? "직접입력" : "목록선택"}
                    </button>
                  </div>
                </div>
                {isCustomEquipment && (
                  <div>
                    <p className="mb-1 text-[11px] text-slate-500">직접 입력 기구명</p>
                    <input
                      className="field"
                      value={groupDraft.equipmentType || ""}
                      onChange={(e) => setGroupDraft((p) => ({ ...p, equipmentType: e.target.value }))}
                      placeholder="예: 소도구 서킷"
                    />
                  </div>
                )}
                {isCustomEquipment && (
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={customEquipmentHasSpring}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setCustomEquipmentHasSpring(checked);
                          if (!checked) {
                            setGroupDraft((p) => ({ ...p, springSetting: "" }));
                          }
                        }}
                      />
                      스프링 세팅 사용
                    </label>
                  </div>
                )}
                {shouldShowSpringSetting && (
                  <div className="md:col-span-2">
                    <p className="mb-1 text-[11px] text-slate-500">스프링 세팅</p>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      {sequenceSpringMode === "preset" ? (
                        <select
                          className="field"
                          value={springSettingOptions.includes(groupDraft.springSetting || "") ? groupDraft.springSetting || "" : ""}
                          onChange={(e) => setGroupDraft((p) => ({ ...p, springSetting: e.target.value }))}
                        >
                          <option value="">선택</option>
                          {springSettingOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name="springSetting"
                          className="field"
                          value={groupDraft.springSetting}
                          onChange={(e) => setGroupDraft((p) => ({ ...p, springSetting: e.target.value }))}
                          placeholder="예: red / red / blue"
                        />
                      )}
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-2 text-xs text-slate-700"
                        onClick={() => setSequenceSpringMode((m) => (m === "preset" ? "custom" : "preset"))}
                      >
                        {sequenceSpringMode === "preset" ? "직접입력" : "목록선택"}
                      </button>
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <p className="mb-1 text-[11px] text-slate-500">오늘 시퀀스</p>
                  <textarea name="todaySequence" className="field min-h-16" value={groupDraft.todaySequence} onChange={(e) => setGroupDraft((p) => ({ ...p, todaySequence: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <p className="mb-1 text-[11px] text-slate-500">다음 시퀀스 계획</p>
                  <textarea name="nextSequence" className="field min-h-16" value={groupDraft.nextSequence} onChange={(e) => setGroupDraft((p) => ({ ...p, nextSequence: e.target.value }))} />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                    onClick={applyLatestSequence}
                  >
                    이전 시퀀스 불러오기
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50"
                    onClick={cancelApplyPreviousSequence}
                    disabled={!sequenceLoadBackup}
                  >
                    불러오기 취소
                  </button>
                  <span className="text-[11px] text-slate-500">
                    {latestReusableSequence
                      ? `최근 기록: ${latestReusableSequence.classDate} ${latestReusableSequence.sessionStartTime || ""} ${latestReusableSequence.lessonType === "PERSONAL" ? "개인" : "그룹"}`
                      : "조건에 맞는 이전 시퀀스 없음"}
                  </span>
                </div>
                <button className="btn md:col-span-2">시퀀스 저장</button>
              </form>

              <form className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={onSaveSequenceTemplate}>
                <input className="field" value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} placeholder="템플릿 제목 (예: 허리안정 입문)" />
                <button className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700" disabled={createGroupSequenceTemplateMutation.isPending}>
                  {createGroupSequenceTemplateMutation.isPending ? "저장중..." : "템플릿 저장"}
                </button>
              </form>

              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                <select className="field" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                  <option value="">템플릿 불러오기</option>
                  {(groupSequenceTemplatesQuery.data || []).map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700" onClick={() => setSelectedTemplateId("")}>
                  선택 해제
                </button>
              </div>
              <p className="text-[11px] text-slate-500">`템플릿`: 반복 사용용 고정 시퀀스 프리셋, `이전 시퀀스`: 최근 실제 기록 복사 후 수정용</p>
              </section>
              )}

              {activeWorkPane === "report" && (
              <section className={`space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2 ${newSessionCue ? "animate-pulse" : ""}`}>
                <p className="text-xs font-semibold text-emerald-800">리포트 등록</p>
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
                <div>
                  <p className="mb-1 text-[11px] text-slate-500">사진 업로드 (선택)</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="field"
                    onChange={(e) => setPendingReportPhotoFile(e.currentTarget.files?.[0] || null)}
                  />
                </div>
              </form>

              {selectedSession?.hasReport && selectedSessionId !== lastSavedSessionId && !suppressHasReportWarning && (
                <p className="mt-2 text-xs text-amber-700">이미 리포트가 있는 세션입니다. 아래 목록에서 기존 리포트를 확인하세요.</p>
              )}
              </section>
              )}
              </div>
            )}
          </Card>

          <section className="grid gap-4 md:grid-cols-2">
            <Card title="세션 타임라인 (리포트+시퀀스)">
              <VirtualList
                items={timelineSessions}
                height={timelineSessions.length ? 360 : 180}
                rowHeight={112}
                renderRow={(s) => {
                  const report = reportBySessionId[s.id];
                  const seq = sequenceBySessionId[s.id];
                  const active = selectedTimelineSessionId === s.id;
                  const reportFlashing = flashReportSessionId === s.id;
                  const sequenceFlashing = flashSequenceSessionId === s.id;
                  const reportSelected = active && detailPanelMode === "report" && !!report && selectedReportId === report.id;
                  const sequenceSelected = active && detailPanelMode === "sequence" && !!seq && selectedSequenceDetail?.id === (seq as GroupSequenceLog).id;
                  return (
                    <button
                      type="button"
                      onClick={() => onSelectTimelineSession(s.id)}
                      className={`w-full rounded-lg border p-2 text-left transition-all ${active ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white/80"} ${reportFlashing || sequenceFlashing ? "ring-2 ring-emerald-200" : ""}`}
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {s.date} {s.startTime || "시간 미입력"} / {s.type === "PERSONAL" ? "개인" : "그룹"}
                      </p>
                      <p className="text-xs text-slate-500">{toShort(s.memo || "메모 없음", 22)}</p>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                        <button
                          type="button"
                          className={`rounded border px-1.5 py-1 text-left transition-all ${seq ? "border-cyan-300 bg-cyan-50 text-cyan-700" : "border-slate-300 bg-slate-100 text-slate-600"} ${sequenceFlashing ? "ring-2 ring-cyan-300 shadow-[0_0_0_2px_rgba(34,211,238,0.2)]" : ""} ${sequenceSelected ? "ring-2 ring-cyan-400" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTimelineSequenceAction(s.id, (seq as GroupSequenceLog) || null);
                          }}
                        >
                          시퀀스 {seq ? "보기" : "없음"}
                        </button>
                        <button
                          type="button"
                          className={`rounded border px-1.5 py-1 text-left transition-all ${report ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-100 text-slate-600"} ${reportFlashing ? "ring-2 ring-emerald-300 shadow-[0_0_0_2px_rgba(52,211,153,0.2)]" : ""} ${reportSelected ? "ring-2 ring-emerald-400" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTimelineReportAction(s.id, report || null);
                          }}
                        >
                          리포트 {report ? "보기" : "없음"}
                        </button>
                      </div>
                    </button>
                  );
                }}
                getKey={(s) => s.id}
              />
              {!selectedMemberId && <p className="mt-2 text-xs text-slate-500">회원을 선택하면 세션 타임라인이 표시됩니다.</p>}
              {!!selectedMemberId && !timelineSessions.length && <p className="mt-2 text-xs text-slate-500">해당 회원의 세션이 없습니다.</p>}
            </Card>

            <Card title={detailPanelMode === "report" ? "리포트 상세 / 공유" : "시퀀스 상세"}>
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span className="text-slate-500">현재 보기:</span>
                <span className={`rounded px-2 py-0.5 ${detailPanelMode === "report" ? "bg-emerald-100 text-emerald-700" : "bg-cyan-100 text-cyan-700"}`}>
                  {detailPanelMode === "report" ? "리포트 상세" : "시퀀스 상세"}
                </span>
              </div>
              {detailPanelMode === "sequence" && selectedSequenceDetail && (
                <div className="space-y-2 text-xs">
                  <DetailRow label="수업 타입" value={selectedSequenceDetail.lessonType === "PERSONAL" ? "개인" : "그룹"} />
                  <DetailRow label="수업 날짜" value={selectedSequenceDetail.classDate} />
                  <DetailRow label="기구 종류" value={toEquipmentTypeLabel(selectedSequenceDetail.equipmentType) || "-"} />
                  <DetailRow label="기구 브랜드" value={selectedSequenceDetail.equipmentBrand || "-"} />
                  <DetailRow label="연결 세션" value={selectedSequenceDetail.sessionId ? `${sessionById[selectedSequenceDetail.sessionId]?.date || selectedSequenceDetail.classDate} ${sessionById[selectedSequenceDetail.sessionId]?.startTime || selectedSequenceDetail.sessionStartTime || ""}`.trim() : "-"} />
                  <DetailRow label="스프링 세팅" value={selectedSequenceDetail.springSetting || "-"} />
                  <DetailRow label="오늘 시퀀스" value={selectedSequenceDetail.todaySequence || "-"} />
                  <DetailRow label="다음 시퀀스" value={selectedSequenceDetail.nextSequence || "-"} />
                  <DetailRow label="작성일" value={formatDateTime(selectedSequenceDetail.createdAt)} />
                </div>
              )}
              {detailPanelMode === "report" && !selectedReport && (
                <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50/60 text-sm text-slate-500">
                  왼쪽 목록에서 리포트를 선택하세요.
                </div>
              )}
              {detailPanelMode === "report" && selectedReport && (
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
      <section className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[280px_1fr]">
        <Card title="회원 선택">
          <input
            className="field mb-2"
            placeholder="이름/전화 검색"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
          <VirtualList
            items={filteredClients}
            height={memberListHeight}
            rowHeight={memberListRowHeight}
            renderRow={(c) => (
              <button
                type="button"
                onClick={() => onToggleMember(c.id)}
                className={`w-full rounded-lg border px-2 py-1 text-left ${selectedMemberId === c.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white/80"}`}
              >
                <p className="text-sm text-slate-900">
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{c.phone || "전화 없음"}</span>
                </p>
              </button>
            )}
            getKey={(c) => c.id}
          />
        </Card>

        <div className="space-y-4">
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

          <Card title="숙제 목록">
            <ul className="max-h-[24vh] space-y-2 overflow-y-auto pr-1 text-sm">
              {(clientHomeworksQuery.data || []).map((h) => (
                <li key={h.id} className="rounded-lg border border-slate-200 bg-white/80 p-2">
                  <p className="font-medium text-slate-900">{h.content}</p>
                  <p className="text-xs text-slate-500">
                    생성: {formatDateTime(h.createdAt)} {h.remindAt ? `/ 알림: ${formatDateTime(h.remindAt)}` : ""}
                  </p>
                </li>
              ))}
              {!selectedMemberId && <p className="text-xs text-slate-500">회원을 선택하면 숙제 목록이 표시됩니다.</p>}
              {!!selectedMemberId && !(clientHomeworksQuery.data || []).length && <p className="text-xs text-slate-500">등록된 숙제가 없습니다.</p>}
            </ul>
          </Card>

          <Card title="비포/애프터 사진">
            <form className="grid gap-2 md:grid-cols-4" onSubmit={onUploadClientProgressPhoto}>
              <div>
                <p className="mb-1 text-[11px] text-slate-500">구분</p>
                <select className="field" value={progressPhotoPhase} onChange={(e) => setProgressPhotoPhase(e.target.value as "BEFORE" | "AFTER" | "ETC")}>
                  <option value="BEFORE">비포</option>
                  <option value="AFTER">애프터</option>
                  <option value="ETC">기타</option>
                </select>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-slate-500">촬영일</p>
                <input className="field" type="date" value={progressPhotoTakenOn} onChange={(e) => setProgressPhotoTakenOn(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <p className="mb-1 text-[11px] text-slate-500">메모</p>
                <input className="field" value={progressPhotoNote} onChange={(e) => setProgressPhotoNote(e.target.value)} placeholder="예: 체형 정렬 체크" />
              </div>
              <input name="clientProgressPhoto" type="file" accept="image/*" className="field md:col-span-3" />
              <button className="btn md:col-span-1" disabled={uploadClientProgressPhotoMutation.isPending || !selectedMemberId}>
                {uploadClientProgressPhotoMutation.isPending ? "업로드중..." : "사진 업로드"}
              </button>
            </form>

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {(clientProgressPhotosQuery.data || []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white/80 text-left"
                  onClick={() => setSelectedPhotoPreview(clientProgressPhotoUrls[p.id] || p.imageUrl)}
                >
                  <img src={clientProgressPhotoUrls[p.id] || p.imageUrl} alt={p.fileName} className="h-24 w-full object-cover" />
                  <div className="p-2">
                    <p className="text-[11px] font-semibold text-slate-700">{p.phase}</p>
                    <p className="text-[11px] text-slate-500">{p.takenOn || "-"}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
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

function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <article className={`rounded-2xl border border-white/70 bg-white/70 p-4 shadow-lg backdrop-blur-md animate-rise ${className}`}>
      {title && <h2 className="mb-3 font-['Fraunces'] text-xl text-slate-900">{title}</h2>}
      {children}
    </article>
  );
}

function VirtualList<T>({
  items,
  height,
  rowHeight,
  overscan = 4,
  renderRow,
  getKey
}: {
  items: T[];
  height: number;
  rowHeight: number;
  overscan?: number;
  renderRow: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = items.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(items.length, Math.ceil((scrollTop + height) / rowHeight) + overscan);
  const visible = items.slice(start, end);

  return (
    <div className="overflow-y-auto scroll-smooth pr-1" style={{ height }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: totalHeight, position: "relative" }}>
        {visible.map((item, localIndex) => {
          const index = start + localIndex;
          return (
            <div key={getKey(item, index)} style={{ position: "absolute", top: index * rowHeight, left: 0, right: 0, height: rowHeight }}>
              {renderRow(item, index)}
            </div>
          );
        })}
      </div>
    </div>
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

function toEquipmentTypeLabel(raw?: string | null) {
  if (!raw) return "";
  return EQUIPMENT_OPTIONS.find((o) => o.value === raw)?.label || raw;
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
