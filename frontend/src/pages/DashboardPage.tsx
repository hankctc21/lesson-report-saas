import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCenter,
  createClient,
  createClientTrackingLog,
  deleteCenter,
  deleteClientProgressPhoto,
  createGroupSequenceTemplate,
  createGroupSequence,
  updateGroupSequence,
  createReport,
  createSession,
  createShare,
  getClientProfile,
  health,
  listCenters,
  listClientTrackingLogs,
  listClientProgressPhotos,
  listClientReports,
  listClients,
  listGroupSequences,
  listGroupSequenceTemplates,
  listReportPhotos,
  listSessionsWithReportByRange,
  listSessionsWithReportByDate,
  uploadClientProgressPhoto,
  updateClientProgressPhoto,
  uploadReportPhoto,
  upsertClientProfile,
  updateCenter,
  updateClient,
  updateReport
} from "../api/endpoints";
import { api } from "../api/client";

type ReportDraft = {
  summaryItems: string;
  strengthNote: string;
  improveNote: string;
  nextGoal: string;
  homework: string;
  homeworkReminderAt: string;
  homeworkCompleted: boolean;
};

type ClientEditDraft = {
  name: string;
  centerId: string;
  phone: string;
  flagsNote: string;
  note: string;
  preferredLessonType: "" | "PERSONAL" | "GROUP";
  memberStatus: "CURRENT" | "PAUSED" | "FORMER";
};

type SequenceEditDraft = {
  equipmentType: string;
  equipmentBrand: string;
  springSetting: string;
  todaySequence: string;
  nextSequence: string;
  beforeMemo: string;
  afterMemo: string;
  memberNotes: string;
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

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: string;
  minute: string;
};

const createEmptyDraft = (): ReportDraft => ({
  summaryItems: "",
  strengthNote: "",
  improveNote: "",
  nextGoal: "",
  homework: "",
  homeworkReminderAt: currentLocalDateTimeRounded10(),
  homeworkCompleted: false
});

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
type CalendarView = "month" | "week" | "day";
type SequenceMove = {
  id: string;
  name: string;
  focus: string;
  level: "입문" | "중급" | "고급";
};
const PILATES_MOVE_LIBRARY: SequenceMove[] = [
  { id: "hundred", name: "Hundred", focus: "호흡/코어 워밍업", level: "입문" },
  { id: "roll-up", name: "Roll Up", focus: "척추 분절/복부", level: "입문" },
  { id: "roll-over", name: "Roll Over", focus: "척추 유연성/복부", level: "중급" },
  { id: "single-leg-circle", name: "Single Leg Circle", focus: "고관절 안정", level: "입문" },
  { id: "rolling-like-a-ball", name: "Rolling Like a Ball", focus: "코어 밸런스", level: "입문" },
  { id: "single-leg-stretch", name: "Single Leg Stretch", focus: "복부/골반 안정", level: "입문" },
  { id: "double-leg-stretch", name: "Double Leg Stretch", focus: "복부 지구력", level: "입문" },
  { id: "spine-stretch-forward", name: "Spine Stretch Forward", focus: "햄스트링/척추", level: "입문" },
  { id: "open-leg-rocker", name: "Open Leg Rocker", focus: "밸런스/코어", level: "중급" },
  { id: "saw", name: "Saw", focus: "회전/햄스트링", level: "입문" },
  { id: "swan", name: "Swan", focus: "흉추 신전/등", level: "입문" },
  { id: "side-kick-series", name: "Side Kick Series", focus: "둔근/측면 안정", level: "입문" },
  { id: "teaser", name: "Teaser", focus: "전신 코어 컨트롤", level: "고급" },
  { id: "seal", name: "Seal", focus: "척추 가동/코어", level: "중급" },
  { id: "hip-twist", name: "Hip Twist", focus: "복사근/회전 안정", level: "중급" },
  { id: "leg-pull-front", name: "Leg Pull Front", focus: "어깨 안정/코어", level: "중급" },
  { id: "leg-pull-back", name: "Leg Pull Back", focus: "후면 사슬/어깨", level: "중급" },
  { id: "knee-stretch", name: "Knee Stretch", focus: "리포머 코어", level: "입문" },
  { id: "footwork", name: "Footwork", focus: "하지 정렬/기초", level: "입문" },
  { id: "elephant", name: "Elephant", focus: "햄스트링/견갑 안정", level: "중급" }
];
const PERSONAL_META_EMPTY: PersonalMeta = {
  painNote: "",
  goalNote: "",
  surgeryHistory: "",
  beforeClassMemo: "",
  afterClassMemo: "",
  nextLessonPlan: ""
};

export default function DashboardPage({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [sessionDate, setSessionDate] = useState(today);
  const [calendarFocusDate, setCalendarFocusDate] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(today.slice(0, 7));
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [calendarQuickOpen, setCalendarQuickOpen] = useState(false);
  const [calendarQuickTargetDate, setCalendarQuickTargetDate] = useState(today);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [selectedTimelineSessionId, setSelectedTimelineSessionId] = useState("");
  const [detailPanelMode, setDetailPanelMode] = useState<"report" | "sequence">("report");
  const [activeTab, setActiveTab] = useState<"lesson" | "member">("lesson");
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [newCenterName, setNewCenterName] = useState("");
  const [editingCenterId, setEditingCenterId] = useState("");
  const [editingCenterName, setEditingCenterName] = useState("");
  const [lessonTypeFilter, setLessonTypeFilter] = useState<"ALL" | "PERSONAL" | "GROUP">("ALL");
  const [memberStatusFilter, setMemberStatusFilter] = useState<"ALL" | "CURRENT" | "PAUSED" | "FORMER">("ALL");
  const [sessionStartHour, setSessionStartHour] = useState("");
  const [sessionStartMinute, setSessionStartMinute] = useState("00");
  const [sessionRepeatWeeks, setSessionRepeatWeeks] = useState<0 | 4 | 8>(0);
  const [showReportedSession, setShowReportedSession] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showCenterForm, setShowCenterForm] = useState(false);
  const [activeLessonForm, setActiveLessonForm] = useState<"session" | "work" | null>(null);
  const [activeWorkPane, setActiveWorkPane] = useState<"sequence" | "report">("sequence");
  const [memberEditField, setMemberEditField] = useState<keyof ClientEditDraft | "">("");
  const [reportEditField, setReportEditField] = useState<keyof ReportDraft | "">("");
  const [showSequenceEditForm, setShowSequenceEditForm] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [sharePublicUrl, setSharePublicUrl] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const [notice, setNotice] = useState("");
  const [newSessionCue, setNewSessionCue] = useState(false);
  const [pendingSessionAutoSelectId, setPendingSessionAutoSelectId] = useState("");
  const [lastSavedSessionId, setLastSavedSessionId] = useState("");
  const [suppressHasReportWarning, setSuppressHasReportWarning] = useState(false);
  const [draft, setDraft] = useState<ReportDraft>(() => createEmptyDraft());
  const [clientEditDraft, setClientEditDraft] = useState<ClientEditDraft>({
    name: "",
    centerId: "",
    phone: "",
    flagsNote: "",
    note: "",
    preferredLessonType: "",
    memberStatus: "CURRENT"
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [bulkCenterId, setBulkCenterId] = useState("");
  const [bulkLessonType, setBulkLessonType] = useState<"" | "PERSONAL" | "GROUP">("");
  const [reportEditDraft, setReportEditDraft] = useState<ReportDraft>(() => createEmptyDraft());
  const [activeVoiceField, setActiveVoiceField] = useState<keyof ReportDraft | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState("");
  const [selectedSequenceDetail, setSelectedSequenceDetail] = useState<GroupSequenceLog | null>(null);
  const [pendingReportPhotoFile, setPendingReportPhotoFile] = useState<File | null>(null);
  const [sequenceEditDraft, setSequenceEditDraft] = useState<SequenceEditDraft>({
    equipmentType: "",
    equipmentBrand: "",
    springSetting: "",
    todaySequence: "",
    nextSequence: "",
    beforeMemo: "",
    afterMemo: "",
    memberNotes: ""
  });
  const [sequenceLoadBackup, setSequenceLoadBackup] = useState<Pick<GroupSequenceLog, "equipmentType" | "equipmentBrand" | "springSetting" | "todaySequence" | "nextSequence"> | null>(null);
  const [flashReportSessionId, setFlashReportSessionId] = useState("");
  const [flashSequenceSessionId, setFlashSequenceSessionId] = useState("");
  const [flashNewSessionActionId, setFlashNewSessionActionId] = useState("");
  const [progressPhotoPhase, setProgressPhotoPhase] = useState<"BEFORE" | "AFTER" | "ETC">("ETC");
  const [progressPhotoNote, setProgressPhotoNote] = useState("");
  const [progressPhotoTakenOn, setProgressPhotoTakenOn] = useState(today);
  const [pendingClientProgressPhotoFile, setPendingClientProgressPhotoFile] = useState<File | null>(null);
  const [clientProgressPhotoInputKey, setClientProgressPhotoInputKey] = useState(0);
  const [progressPhotoPickerBusy, setProgressPhotoPickerBusy] = useState(false);
  const [editingProgressPhotoId, setEditingProgressPhotoId] = useState("");
  const [progressPhotoEditPhase, setProgressPhotoEditPhase] = useState<"BEFORE" | "AFTER" | "ETC">("ETC");
  const [progressPhotoEditNote, setProgressPhotoEditNote] = useState("");
  const [progressPhotoEditTakenOn, setProgressPhotoEditTakenOn] = useState("");
  const [selectedHistoryKey, setSelectedHistoryKey] = useState("");
  const [showProgressPhotoUploadModal, setShowProgressPhotoUploadModal] = useState(false);
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
  const [sequenceMoveSearch, setSequenceMoveSearch] = useState("");
  const [selectedMoveIds, setSelectedMoveIds] = useState<string[]>([]);
  const [customMoveInput, setCustomMoveInput] = useState("");
  const [customMoveLibrary, setCustomMoveLibrary] = useState<string[]>([]);
  const [customEquipmentHasSpring, setCustomEquipmentHasSpring] = useState(true);
  const [isCustomEquipmentInput, setIsCustomEquipmentInput] = useState(false);
  const [sequenceBrandMode, setSequenceBrandMode] = useState<"preset" | "custom">("preset");
  const [sequenceSpringMode, setSequenceSpringMode] = useState<"preset" | "custom">("preset");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const healthQuery = useQuery({ queryKey: ["health"], queryFn: health, refetchInterval: 15000 });
  const centersQuery = useQuery({ queryKey: ["centers"], queryFn: listCenters });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: () => listClients(undefined) });
  const sessionsQuery = useQuery({
    queryKey: ["sessions-with-report", sessionDate],
    queryFn: () => listSessionsWithReportByDate(sessionDate)
  });
  const monthSessionRange = useMemo(() => getMonthRange(calendarMonth), [calendarMonth]);
  const monthSessionsQuery = useQuery({
    queryKey: ["sessions-with-report-range", monthSessionRange.from, monthSessionRange.to],
    queryFn: () => listSessionsWithReportByRange(monthSessionRange.from, monthSessionRange.to)
  });
  const calendarRange = useMemo(() => {
    if (calendarView === "week") return getWeekRange(calendarFocusDate);
    if (calendarView === "day") return { from: calendarFocusDate, to: calendarFocusDate };
    return getMonthRange(calendarFocusDate.slice(0, 7));
  }, [calendarFocusDate, calendarView]);
  const calendarSessionsQuery = useQuery({
    queryKey: ["sessions-with-report-range-calendar", calendarRange.from, calendarRange.to],
    queryFn: () => listSessionsWithReportByRange(calendarRange.from, calendarRange.to)
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
  const clientTrackingLogsQuery = useQuery({
    queryKey: ["client-tracking-logs", selectedMemberId],
    queryFn: () => listClientTrackingLogs(selectedMemberId),
    enabled: !!selectedMemberId
  });
  const groupSequencesQuery = useQuery({
    queryKey: ["group-sequences", selectedCenterId, lessonTypeFilter, (centersQuery.data || []).map((c) => c.id).join(",")],
    queryFn: async () => {
      const type = lessonTypeFilter === "ALL" ? undefined : lessonTypeFilter;
      if (selectedCenterId) return listGroupSequences(selectedCenterId, type);
      const allCenters = centersQuery.data || [];
      if (!allCenters.length) return [];
      const allResults = await Promise.all(allCenters.map((c) => listGroupSequences(c.id, type)));
      return allResults.flat();
    },
    enabled: !!(centersQuery.data || []).length
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
  const centerTabs = useMemo(() => [...centers].sort((a, b) => a.name.localeCompare(b.name, "ko")), [centers]);
  const clients = useMemo(() => clientsQuery.data || [], [clientsQuery.data]);
  const selectedCenter = useMemo(
    () => centers.find((c) => c.id === selectedCenterId) || centers[0] || null,
    [centers, selectedCenterId]
  );
  const filteredClients = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const byCenter = selectedCenterId ? clients.filter((c) => c.centerId === selectedCenterId) : clients;
    const base = memberStatusFilter === "ALL" ? byCenter : byCenter.filter((c) => (c.memberStatus || "CURRENT") === memberStatusFilter);
    if (!q) return base;
    return base.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || "").includes(q));
  }, [clients, memberSearch, memberStatusFilter, selectedCenterId]);
  const selectedClientIdSet = useMemo(() => new Set(selectedClientIds), [selectedClientIds]);
  const memberListRowHeight = 40;
  const memberListMaxVisible = 6;
  const memberListHeight = Math.min(filteredClients.length, memberListMaxVisible) * memberListRowHeight || memberListRowHeight;

  const selectedClient = useMemo(() => clients.find((c) => c.id === selectedMemberId) || null, [clients, selectedMemberId]);
  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);
  const selectedClientCenterName = useMemo(
    () => centers.find((x) => x.id === selectedClient?.centerId)?.name || "-",
    [centers, selectedClient?.centerId]
  );

  const daySessionOptions = useMemo(() => {
    const rows = sessionsQuery.data || [];
    const byType = lessonTypeFilter === "ALL" ? rows : rows.filter((s) => s.type === lessonTypeFilter);
    return showReportedSession ? byType : byType.filter((s) => !s.hasReport);
  }, [sessionsQuery.data, showReportedSession, lessonTypeFilter]);
  const timelineSessions = useMemo(() => {
    const rows = sessionsQuery.data || [];
    const byType = lessonTypeFilter === "ALL" ? rows : rows.filter((s) => s.type === lessonTypeFilter);
    return [...byType].sort((a, b) => {
      const ak = `${a.startTime || "99:99"} ${a.createdAt}`;
      const bk = `${b.startTime || "99:99"} ${b.createdAt}`;
      return ak < bk ? -1 : ak > bk ? 1 : 0;
    });
  }, [sessionsQuery.data, lessonTypeFilter]);
  const monthSessionsForCalendar = useMemo(() => {
    const rows = monthSessionsQuery.data || [];
    return lessonTypeFilter === "ALL" ? rows : rows.filter((s) => s.type === lessonTypeFilter);
  }, [monthSessionsQuery.data, lessonTypeFilter]);
  const calendarSessions = useMemo(() => {
    const rows = calendarSessionsQuery.data || [];
    const byType = lessonTypeFilter === "ALL" ? rows : rows.filter((s) => s.type === lessonTypeFilter);
    return [...byType].sort((a, b) => {
      const ak = `${a.date} ${a.startTime || "00:00"} ${a.createdAt}`;
      const bk = `${b.date} ${b.startTime || "00:00"} ${b.createdAt}`;
      return ak < bk ? 1 : -1;
    });
  }, [calendarSessionsQuery.data, lessonTypeFilter]);
  const calendarDayStatus = useMemo(() => {
    return calendarSessions.reduce<Record<string, { total: number; report: number; homework: number; homeworkDone: number }>>((acc, s) => {
      const key = s.date;
      const cur = acc[key] || { total: 0, report: 0, homework: 0, homeworkDone: 0 };
      cur.total += 1;
      if (s.hasReport) cur.report += 1;
      if (s.hasHomework) cur.homework += 1;
      if (s.hasHomework && s.homeworkCompleted) cur.homeworkDone += 1;
      acc[key] = cur;
      return acc;
    }, {});
  }, [calendarSessions]);
  const calendarSessionsByDate = useMemo(
    () => calendarSessions.reduce<Record<string, typeof calendarSessions>>((acc, s) => {
      (acc[s.date] ||= []).push(s);
      return acc;
    }, {}),
    [calendarSessions]
  );
  const monthDayStatus = useMemo(() => {
    return monthSessionsForCalendar.reduce<Record<string, { total: number; report: number; homework: number; homeworkDone: number }>>((acc, s) => {
      const key = s.date;
      const cur = acc[key] || { total: 0, report: 0, homework: 0, homeworkDone: 0 };
      cur.total += 1;
      if (s.hasReport) cur.report += 1;
      if (s.hasHomework) cur.homework += 1;
      if (s.hasHomework && s.homeworkCompleted) cur.homeworkDone += 1;
      acc[key] = cur;
      return acc;
    }, {});
  }, [monthSessionsForCalendar]);

  const selectedSession = useMemo(
    () => (sessionsQuery.data || []).find((s) => s.id === selectedSessionId) || null,
    [sessionsQuery.data, selectedSessionId]
  );
  const sessionById = useMemo(
    () => Object.fromEntries((sessionsQuery.data || []).map((s) => [s.id, s])),
    [sessionsQuery.data]
  );

  const reports = useMemo(() => reportsQuery.data || [], [reportsQuery.data]);
  const previousHomeworkOptions = useMemo(() => {
    const seen = new Set<string>();
    return reports
      .filter((r) => !!r.homework?.trim())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((r) => r.homework!.trim())
      .filter((value) => {
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      })
      .slice(0, 12);
  }, [reports]);
  const selectedReport = useMemo(() => reports.find((r) => r.id === selectedReportId) || null, [reports, selectedReportId]);
  const reportBySessionId = useMemo(
    () => Object.fromEntries(reports.map((r) => [r.sessionId, r])),
    [reports]
  );
  const sequenceBySessionId = useMemo(
    () => Object.fromEntries((groupSequencesQuery.data || []).filter((g) => !!g.sessionId).map((g) => [g.sessionId as string, g])),
    [groupSequencesQuery.data]
  );
  const calendarDayOverview = useMemo(
    () => summarizeDayOverview(calendarSessions, sequenceBySessionId),
    [calendarSessions, sequenceBySessionId]
  );
  const monthDayOverview = useMemo(
    () => summarizeDayOverview(monthSessionsForCalendar, sequenceBySessionId),
    [monthSessionsForCalendar, sequenceBySessionId]
  );
  const beforeProgressPhotos = useMemo(
    () => (clientProgressPhotosQuery.data || []).filter((p) => p.phase === "BEFORE"),
    [clientProgressPhotosQuery.data]
  );
  const afterProgressPhotos = useMemo(
    () => (clientProgressPhotosQuery.data || []).filter((p) => p.phase === "AFTER"),
    [clientProgressPhotosQuery.data]
  );
  const etcProgressPhotos = useMemo(
    () => (clientProgressPhotosQuery.data || []).filter((p) => p.phase !== "BEFORE" && p.phase !== "AFTER"),
    [clientProgressPhotosQuery.data]
  );
  const historyEntries = useMemo(
    () =>
      (clientTrackingLogsQuery.data || [])
        .map((log) => ({
          key: `tracking:${log.id}`,
          kind: "tracking" as const,
          createdAt: log.createdAt,
          summary: `${log.painNote || "-"} / ${log.goalNote || "-"}`,
          detail: log
        }))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [clientTrackingLogsQuery.data]
  );
  const selectedHistoryEntry = useMemo(
    () => historyEntries.find((x) => x.key === selectedHistoryKey) || null,
    [historyEntries, selectedHistoryKey]
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
  const sequenceMoves = useMemo(() => {
    const q = sequenceMoveSearch.trim().toLowerCase();
    const merged = [
      ...PILATES_MOVE_LIBRARY,
      ...customMoveLibrary.map((name, idx) => ({
        id: `custom-${idx}-${name}`,
        name,
        focus: "커스텀",
        level: "입문" as const
      }))
    ];
    if (!q) return merged;
    return merged.filter((m) => m.name.toLowerCase().includes(q) || m.focus.toLowerCase().includes(q));
  }, [sequenceMoveSearch, customMoveLibrary]);
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
  const timelineScrollTargetId = flashReportSessionId || flashSequenceSessionId || flashNewSessionActionId || selectedTimelineSessionId;
  const calendarDateKeys = useMemo(
    () => Object.keys(calendarSessionsByDate).sort((a, b) => (a < b ? -1 : 1)),
    [calendarSessionsByDate]
  );

  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
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
  const updateCenterMutation = useMutation({
    mutationFn: ({ centerId, name }: { centerId: string; name: string }) => updateCenter(centerId, { name }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["centers"] });
      setSelectedCenterId(data.id);
      setEditingCenterId("");
      setEditingCenterName("");
      setNotice("센터 이름을 수정했습니다.");
    }
  });
  const deleteCenterMutation = useMutation({
    mutationFn: (centerId: string) => deleteCenter(centerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["centers"] });
      setSelectedCenterId("");
      setEditingCenterId("");
      setEditingCenterName("");
      setNotice("센터를 삭제했습니다.");
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: async (payload: {
      clientIds: string[];
      date: string;
      type: "PERSONAL" | "GROUP";
      memo?: string;
      startTime?: string;
      repeatWeeks?: number;
    }) =>
      Promise.all(
        Array.from({ length: (payload.repeatWeeks || 0) + 1 }, (_, weekOffset) => shiftDay(payload.date, weekOffset * 7)).flatMap((date) =>
          payload.clientIds.map((clientId) =>
            createSession({
              clientId,
              date,
              type: payload.type,
              memo: payload.memo,
              startTime: payload.startTime
            })
          )
        )
      ),
    onSuccess: (created) => {
      if (!created.length) return;
      const first = created[0];
      qc.invalidateQueries({ queryKey: ["sessions-with-report", sessionDate] });
      qc.invalidateQueries({ queryKey: ["sessions-with-report-range"], exact: false });
      qc.invalidateQueries({ queryKey: ["sessions-with-report-range-calendar"], exact: false });
      setSelectedSessionId(first.id);
      setGroupDraft((prev) => ({
        ...prev,
        sessionId: first.id,
        lessonType: first.type,
        classDate: first.date
      }));
      setPendingSessionAutoSelectId(first.id);
      setSelectedMemberId(first.clientId);
      setNewSessionCue(true);
      setFlashNewSessionActionId(first.id);
      setNotice(created.length > 1 ? `그룹 세션 ${created.length}건을 생성했습니다.` : "세션 생성 완료. 세션 타임라인에서 시퀀스/리포트 기록을 이어서 진행하세요.");
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: ({
      clientId,
      payload
    }: {
      clientId: string;
      payload: {
        name?: string;
        centerId?: string;
        phone?: string;
        flagsNote?: string;
        note?: string;
        preferredLessonType?: "PERSONAL" | "GROUP";
        memberStatus?: "CURRENT" | "PAUSED" | "FORMER";
      };
    }) =>
      updateClient(clientId, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      if (data.centerId && data.centerId !== selectedCenterId) {
        setSelectedCenterId(data.centerId);
      }
      setSelectedMemberId(data.id);
      setMemberEditField("");
      setNotice("회원 정보(센터 포함)가 수정되었습니다.");
    }
  });
  const bulkClientUpdateMutation = useMutation({
    mutationFn: async (payload: { centerId?: string; preferredLessonType?: "PERSONAL" | "GROUP" }) => {
      const ids = selectedClientIds;
      if (!ids.length) return [];
      return Promise.all(
        ids.map((id) =>
          updateClient(id, {
            centerId: payload.centerId || undefined,
            preferredLessonType: payload.preferredLessonType || undefined
          })
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setNotice(`선택 회원 ${selectedClientIds.length}명 일괄 변경 완료.`);
      setSelectionMode(false);
      setSelectedClientIds([]);
      setBulkCenterId("");
      setBulkLessonType("");
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
      setSelectedTimelineSessionId(data.sessionId);
      setSelectedSessionId(data.sessionId);
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
        nextGoal: payload.nextGoal || undefined,
        homework: payload.homework || undefined,
        homeworkReminderAt: toIsoFromLocalDateTime(payload.homeworkReminderAt) || undefined,
        homeworkCompleted: payload.homeworkCompleted
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports", data.clientId] });
      setSelectedReportId(data.id);
      setSelectedTimelineSessionId(data.sessionId);
      setFlashReportSessionId(data.sessionId);
      setReportEditField("");
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
    onMutate: () => {
      setNotice("사진 업로드 중...");
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["report-photos", vars.reportId] });
      setNotice("사진이 업로드되었습니다.");
    },
    onError: () => {
      setNotice("사진 업로드 중 오류가 발생했습니다.");
    }
  });
  const upsertClientProfileMutation = useMutation({
    mutationFn: ({ clientId, payload }: { clientId: string; payload: PersonalMeta }) =>
      upsertClientProfile(clientId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-profile", selectedMemberId] });
    }
  });
  const createTrackingLogMutation = useMutation({
    mutationFn: ({
      clientId,
      payload
    }: {
      clientId: string;
      payload: {
        painNote?: string;
        goalNote?: string;
        surgeryHistory?: string;
        beforeClassMemo?: string;
        afterClassMemo?: string;
        nextLessonPlan?: string;
      };
    }) => createClientTrackingLog(clientId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tracking-logs", selectedMemberId] });
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
  const updateGroupSequenceMutation = useMutation({
    mutationFn: ({ sequenceId, payload }: { sequenceId: string; payload: SequenceEditDraft }) =>
      updateGroupSequence(sequenceId, {
        equipmentType: payload.equipmentType || undefined,
        equipmentBrand: payload.equipmentBrand || undefined,
        springSetting: payload.springSetting || undefined,
        todaySequence: payload.todaySequence || undefined,
        nextSequence: payload.nextSequence || undefined,
        beforeMemo: payload.beforeMemo || undefined,
        afterMemo: payload.afterMemo || undefined,
        memberNotes: payload.memberNotes || undefined
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["group-sequences", selectedCenterId], exact: false });
      setSelectedSequenceDetail(data as GroupSequenceLog);
      setShowSequenceEditForm(false);
      if (data.sessionId) {
        setFlashSequenceSessionId(data.sessionId);
        setSelectedTimelineSessionId(data.sessionId);
      }
      setNotice("시퀀스를 수정했습니다.");
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
    onMutate: () => {
      setNotice("비포/애프터 사진 업로드 중...");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-progress-photos", selectedMemberId] });
      setPendingClientProgressPhotoFile(null);
      setClientProgressPhotoInputKey((k) => k + 1);
      setShowProgressPhotoUploadModal(false);
      setNotice("비포/애프터 사진을 저장했습니다.");
    },
    onError: () => {
      setNotice("비포/애프터 사진 업로드 중 오류가 발생했습니다.");
    }
  });
  const updateClientProgressPhotoMutation = useMutation({
    mutationFn: ({
      clientId,
      photoId,
      payload
    }: {
      clientId: string;
      photoId: string;
      payload: { phase?: "BEFORE" | "AFTER" | "ETC"; note?: string; takenOn?: string };
    }) => updateClientProgressPhoto(clientId, photoId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-progress-photos", selectedMemberId] });
      setEditingProgressPhotoId("");
      setNotice("사진 정보를 수정했습니다.");
    },
    onError: () => {
      setNotice("사진 수정 중 오류가 발생했습니다.");
    }
  });
  const deleteClientProgressPhotoMutation = useMutation({
    mutationFn: ({ clientId, photoId }: { clientId: string; photoId: string }) => deleteClientProgressPhoto(clientId, photoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-progress-photos", selectedMemberId] });
      setNotice("사진을 삭제했습니다.");
    },
    onError: () => {
      setNotice("사진 삭제 중 오류가 발생했습니다.");
    }
  });

  useEffect(() => {
    if (!newSessionCue) return;
    const t = setTimeout(() => setNewSessionCue(false), 1600);
    return () => clearTimeout(t);
  }, [newSessionCue]);

  useEffect(() => {
    if (!flashReportSessionId) return;
    const t = setTimeout(() => setFlashReportSessionId(""), 2400);
    return () => clearTimeout(t);
  }, [flashReportSessionId]);

  useEffect(() => {
    if (!flashSequenceSessionId) return;
    const t = setTimeout(() => setFlashSequenceSessionId(""), 2400);
    return () => clearTimeout(t);
  }, [flashSequenceSessionId]);

  useEffect(() => {
    if (!flashNewSessionActionId) return;
    const t = setTimeout(() => setFlashNewSessionActionId(""), 2800);
    return () => clearTimeout(t);
  }, [flashNewSessionActionId]);

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
    const stillVisible = daySessionOptions.some((s) => s.id === selectedSessionId);
    if (stillVisible) return;
    if (showReportedSession) return;
    setSelectedSessionId(daySessionOptions[0]?.id || "");
  }, [selectedSessionId, daySessionOptions, showReportedSession]);

  useEffect(() => {
    if (!pendingSessionAutoSelectId) return;
    const created = (sessionsQuery.data || []).find((s) => s.id === pendingSessionAutoSelectId);
    if (!created) return;
    setSelectedMemberId(created.clientId);
    setSelectedSessionId(created.id);
    setSelectedTimelineSessionId(created.id);
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
      setMemberEditField("");
      setClientEditDraft({ name: "", centerId: "", phone: "", flagsNote: "", note: "", preferredLessonType: "", memberStatus: "CURRENT" });
      return;
    }
    setClientEditDraft({
      name: selectedClient.name || "",
      centerId: selectedClient.centerId || selectedCenterId || "",
      phone: selectedClient.phone || "",
      flagsNote: selectedClient.flagsNote || "",
      note: selectedClient.note || "",
      preferredLessonType: selectedClient.preferredLessonType || "",
      memberStatus: selectedClient.memberStatus || "CURRENT"
    });
  }, [selectedClient, selectedCenterId]);

  useEffect(() => {
    if (!selectedReport) {
      setReportEditField("");
      setReportEditDraft(createEmptyDraft());
      return;
    }
    setReportEditDraft({
      summaryItems: selectedReport.summaryItems || "",
      strengthNote: selectedReport.strengthNote || "",
      improveNote: selectedReport.improveNote || "",
      nextGoal: selectedReport.nextGoal || "",
      homework: selectedReport.homework || "",
      homeworkReminderAt: toLocalDateTimeInput(selectedReport.homeworkReminderAt) || currentLocalDateTimeRounded10(),
      homeworkCompleted: selectedReport.homeworkCompleted || false
    });
  }, [selectedReport]);

  useEffect(() => {
    if (!sessionDate) return;
    setCalendarMonth(sessionDate.slice(0, 7));
    setCalendarFocusDate(sessionDate);
  }, [sessionDate]);

  useEffect(() => {
    if (!selectedSequenceDetail) {
      setShowSequenceEditForm(false);
      return;
    }
    setSequenceEditDraft({
      equipmentType: selectedSequenceDetail.equipmentType || "",
      equipmentBrand: selectedSequenceDetail.equipmentBrand || "",
      springSetting: selectedSequenceDetail.springSetting || "",
      todaySequence: selectedSequenceDetail.todaySequence || "",
      nextSequence: selectedSequenceDetail.nextSequence || "",
      beforeMemo: selectedSequenceDetail.beforeMemo || "",
      afterMemo: selectedSequenceDetail.afterMemo || "",
      memberNotes: selectedSequenceDetail.memberNotes || ""
    });
  }, [selectedSequenceDetail]);

  useEffect(() => {
    if (selectedCenterId) {
      setGroupDraft((prev) => ({ ...prev, centerId: selectedCenterId }));
      return;
    }
    if (!groupDraft.centerId && centerTabs.length) {
      setGroupDraft((prev) => ({ ...prev, centerId: centerTabs[0].id }));
    }
  }, [selectedCenterId, centerTabs, groupDraft.centerId]);

  useEffect(() => {
    if (!selectedCenterId) {
      setEditingCenterId("");
      setEditingCenterName("");
      return;
    }
  }, [selectedCenterId, centers]);

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
    setSelectedHistoryKey("");
  }, [selectedMemberId]);

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
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
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
    const fd = new FormData(e.currentTarget);
    const type = String(fd.get("type") || "PERSONAL") as "PERSONAL" | "GROUP";
    const date = String(fd.get("date") || today);
    const memo = String(fd.get("memo") || "");
    const startTime = String(fd.get("startTime") || "") || undefined;
    const repeatWeeks = Number(fd.get("repeatWeeks") || 0);
    const requestedIds = type === "GROUP"
      ? (selectedClientIds.length ? selectedClientIds : selectedMemberId ? [selectedMemberId] : [])
      : selectedMemberId
        ? [selectedMemberId]
        : [];
    if (!requestedIds.length) {
      setNotice(type === "GROUP" ? "그룹 세션은 회원을 1명 이상 선택해야 합니다." : "개인 세션은 회원을 선택해야 합니다.");
      return;
    }
    const existing = sessionsQuery.data || [];
    const candidateDates = Array.from({ length: (type === "GROUP" ? repeatWeeks : 0) + 1 }, (_, weekOffset) => shiftDay(date, weekOffset * 7));
    const dedupedClientIds = requestedIds.filter((clientId) =>
      candidateDates.some((candidateDate) => !existing.some((s) => s.clientId === clientId && s.type === type && s.date === candidateDate && (s.startTime || "") === (startTime || "")))
    );
    if (!dedupedClientIds.length) {
      setNotice("같은 날짜/시간/유형의 세션이 이미 있어 생성을 건너뛰었습니다.");
      return;
    }
    setNotice("");
    createSessionMutation.mutate({
      clientIds: dedupedClientIds,
      date,
      type,
      memo,
      startTime,
      repeatWeeks: type === "GROUP" ? repeatWeeks : 0
    });
  };
  const onPickCalendarDate = (date: string, openQuick = false) => {
    setCalendarFocusDate(date);
    setSessionDate(date);
    if (openQuick) {
      setCalendarQuickTargetDate(date);
      setCalendarQuickOpen(true);
    }
  };
  const startQuickAction = (action: "session" | "sequence" | "report") => {
    setSessionDate(calendarQuickTargetDate);
    if (action === "session") {
      setActiveLessonForm("session");
      setCalendarQuickOpen(false);
      return;
    }
    setActiveLessonForm("work");
    setActiveWorkPane(action === "sequence" ? "sequence" : "report");
    setCalendarQuickOpen(false);
    if (action === "report" && !selectedMemberId) {
      setNotice("리포트는 회원 선택 후 진행하면 더 빠릅니다.");
    }
  };
  const moveCalendar = (amount: number) => {
    const next =
      calendarView === "month"
        ? shiftMonth(calendarFocusDate.slice(0, 7), amount) + "-01"
        : shiftDay(calendarFocusDate, calendarView === "week" ? amount * 7 : amount);
    onPickCalendarDate(next);
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
        note: clientEditDraft.note || undefined,
        preferredLessonType: clientEditDraft.preferredLessonType || undefined,
        memberStatus: clientEditDraft.memberStatus
      }
    });
  };
  const onSaveClientInlineField = () => {
    if (!selectedMemberId) return;
    if (!clientEditDraft.name.trim()) {
      setNotice("회원 이름은 필수입니다.");
      return;
    }
    updateClientMutation.mutate({
      clientId: selectedMemberId,
      payload: {
        name: clientEditDraft.name.trim(),
        centerId: clientEditDraft.centerId || selectedCenterId || undefined,
        phone: clientEditDraft.phone || undefined,
        flagsNote: clientEditDraft.flagsNote || undefined,
        note: clientEditDraft.note || undefined,
        preferredLessonType: clientEditDraft.preferredLessonType || undefined,
        memberStatus: clientEditDraft.memberStatus
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
      nextGoal: draft.nextGoal,
      homework: draft.homework,
      homeworkReminderAt: toIsoFromLocalDateTime(draft.homeworkReminderAt) || undefined,
      homeworkCompleted: draft.homeworkCompleted
    });
  };

  const onChangeSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSuppressHasReportWarning(false);
    const session = (sessionsQuery.data || []).find((s) => s.id === sessionId);
    if (session) {
      setSelectedMemberId(session.clientId);
      setGroupDraft((prev) => ({
        ...prev,
        sessionId: session.id,
        lessonType: session.type,
        classDate: session.date
      }));
    }
  };
  const onAddMembersToSelectedGroupSession = () => {
    if (!selectedSession || selectedSession.type !== "GROUP") {
      setNotice("그룹 세션을 먼저 선택해주세요.");
      return;
    }
    if (!selectedClientIds.length) {
      setNotice("추가할 회원을 선택하세요. (멀티 선택 모드)");
      return;
    }
    const existing = sessionsQuery.data || [];
    const startTime = selectedSession.startTime || undefined;
    const candidateIds = selectedClientIds.filter(
      (clientId) =>
        !existing.some(
          (s) =>
            s.clientId === clientId &&
            s.type === "GROUP" &&
            s.date === selectedSession.date &&
            (s.startTime || "") === (selectedSession.startTime || "")
        )
    );
    if (!candidateIds.length) {
      setNotice("선택 회원은 이미 같은 그룹 시간대 세션에 포함되어 있습니다.");
      return;
    }
    createSessionMutation.mutate({
      clientIds: candidateIds,
      date: selectedSession.date,
      type: "GROUP",
      memo: selectedSession.memo || "",
      startTime
    });
  };

  const onToggleMember = (memberId: string) => {
    setSelectedMemberId((prev) => (prev === memberId ? "" : memberId));
  };

  const toggleSelectionMember = (memberId: string) => {
    setSelectedClientIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  };

  const onMemberRowClick = (
    memberId: string,
    index: number,
    event: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }
  ) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    const withToggleKey = !!event.ctrlKey || !!event.metaKey;
    if (withToggleKey) {
      setSelectionMode(true);
      toggleSelectionMember(memberId);
      setSelectedMemberId(memberId);
      return;
    }

    if (selectionMode) {
      toggleSelectionMember(memberId);
      setSelectedMemberId(memberId);
      return;
    }

    onToggleMember(memberId);
  };

  const onMemberPointerDown = (memberId: string, index: number, pointerType: string) => {
    if (pointerType !== "touch") return;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      setSelectionMode(true);
      toggleSelectionMember(memberId);
      setSelectedMemberId(memberId);
      longPressTriggeredRef.current = true;
    }, 450);
  };

  const clearMemberPointerPress = () => {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const endSelectionMode = () => {
    setSelectionMode(false);
    setSelectedClientIds([]);
  };

  const applyBulkCenter = () => {
    if (!selectedClientIds.length) {
      setNotice("일괄 변경할 회원을 먼저 선택하세요.");
      return;
    }
    if (!bulkCenterId) {
      setNotice("변경할 센터를 선택하세요.");
      return;
    }
    setNotice("");
    bulkClientUpdateMutation.mutate({ centerId: bulkCenterId });
  };

  const applyBulkLessonType = () => {
    if (!selectedClientIds.length) {
      setNotice("일괄 변경할 회원을 먼저 선택하세요.");
      return;
    }
    if (!bulkLessonType) {
      setNotice("변경할 기본 수업형태를 선택하세요.");
      return;
    }
    setNotice("");
    bulkClientUpdateMutation.mutate({ preferredLessonType: bulkLessonType });
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
    const session = (sessionsQuery.data || []).find((s) => s.id === sessionId);
    if (session) setSelectedMemberId(session.clientId);
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
    const session = (sessionsQuery.data || []).find((s) => s.id === sessionId);
    if (session) {
      setSelectedMemberId(session.clientId);
      setSessionDate(session.date);
    }
    if (report?.id) {
      setSelectedReportId(report.id);
      setSelectedSequenceDetail(null);
      setDetailPanelMode("report");
      return;
    }
    setCalendarQuickOpen(false);
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
    const selectedSessionRow = (sessionsQuery.data || []).find((s) => s.id === sessionId);
    if (selectedSessionRow) {
      setSelectedMemberId(selectedSessionRow.clientId);
      setSessionDate(selectedSessionRow.date);
    }
    if (sequence) {
      setSelectedSequenceDetail(sequence);
      setSelectedReportId("");
      setDetailPanelMode("sequence");
      return;
    }
    const session = selectedSessionRow || (sessionsQuery.data || []).find((s) => s.id === sessionId);
    setCalendarQuickOpen(false);
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
    setSelectedMemberId(session.clientId);
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
  const toggleSequenceMove = (moveId: string) => {
    setSelectedMoveIds((prev) => (prev.includes(moveId) ? prev.filter((id) => id !== moveId) : [...prev, moveId]));
  };
  const addSelectedMovesToSequence = (target: "today" | "next") => {
    if (!selectedMoveIds.length) {
      setNotice("추가할 동작을 먼저 선택하세요.");
      return;
    }
    const allMoves = [
      ...PILATES_MOVE_LIBRARY,
      ...customMoveLibrary.map((name, idx) => ({
        id: `custom-${idx}-${name}`,
        name,
        focus: "커스텀",
        level: "입문" as const
      }))
    ];
    const selectedNames = allMoves.filter((m) => selectedMoveIds.includes(m.id)).map((m) => m.name);
    if (!selectedNames.length) {
      setNotice("선택한 동작을 찾을 수 없습니다.");
      return;
    }
    setGroupDraft((prev) => {
      const base = target === "today" ? prev.todaySequence || "" : prev.nextSequence || "";
      const merged = mergeSequenceLines(base, selectedNames);
      return target === "today" ? { ...prev, todaySequence: merged } : { ...prev, nextSequence: merged };
    });
    setNotice(`${selectedNames.length}개 동작을 ${target === "today" ? "오늘" : "다음"} 시퀀스에 추가했습니다.`);
  };
  const onAddCustomMove = () => {
    const value = customMoveInput.trim();
    if (!value) return;
    if (customMoveLibrary.includes(value)) {
      setNotice("이미 등록된 커스텀 동작입니다.");
      return;
    }
    setCustomMoveLibrary((prev) => [...prev, value]);
    setCustomMoveInput("");
    setNotice("커스텀 동작을 라이브러리에 추가했습니다.");
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
  const onSaveReportInlineField = () => {
    if (!selectedReportId) return;
    setNotice("");
    updateReportMutation.mutate({
      reportId: selectedReportId,
      payload: reportEditDraft
    });
  };

  const onUpdateSequence = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSequenceDetail?.id) return;
    setNotice("");
    updateGroupSequenceMutation.mutate({
      sequenceId: selectedSequenceDetail.id,
      payload: sequenceEditDraft
    });
  };

  const onAddCenter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = newCenterName.trim();
    if (!name) return;
    createCenterMutation.mutate({ name });
  };

  const onPickCenter = (centerId: string, withManageKey: boolean) => {
    setSelectedCenterId((prev) => (prev === centerId && !withManageKey ? "" : centerId));
    setShowCenterForm(false);
    if (withManageKey) {
      const center = centers.find((c) => c.id === centerId);
      setEditingCenterId(centerId);
      setEditingCenterName(center?.name || "");
      return;
    }
    setEditingCenterId("");
    setEditingCenterName("");
  };
  const onSaveCenterInline = (centerId: string) => {
    const name = editingCenterName.trim();
    if (!name) {
      setNotice("센터 이름을 입력하세요.");
      return;
    }
    updateCenterMutation.mutate({ centerId, name });
  };
  const onDeleteCenterInline = (centerId: string) => {
    if (!window.confirm("이 센터를 삭제할까요? 기존 수업/회원 기록은 보존됩니다.")) return;
    deleteCenterMutation.mutate(centerId);
  };

  const onSavePersonalMeta = async (e: FormEvent<HTMLFormElement>) => {
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
      nextLessonPlan: String(fd.get("nextLessonPlan") || "")
    };
    setPersonalMetaDraft(next);
    try {
      await upsertClientProfileMutation.mutateAsync({
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

      await createTrackingLogMutation.mutateAsync({
        clientId: selectedMemberId,
        payload: {
          painNote: next.painNote || undefined,
          goalNote: next.goalNote || undefined,
          surgeryHistory: next.surgeryHistory || undefined,
          beforeClassMemo: next.beforeClassMemo || undefined,
          afterClassMemo: next.afterClassMemo || undefined,
          nextLessonPlan: next.nextLessonPlan || undefined
        }
      });
      setNotice("회원 추적 저장 완료 (프로필 + 기록).");
    } catch {
      setNotice("회원 추적 저장 중 오류가 발생했습니다. 입력 형식을 확인해주세요.");
    }
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
      nextGoal: `다음 수업 목표: 가동성 + 안정성 균형 (${hhmm} 초안)`,
      homework: "호흡+코어 10분 복습",
      homeworkReminderAt: currentLocalDateTimeRounded10(),
      homeworkCompleted: false
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
    const file = pendingClientProgressPhotoFile;
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
    setProgressPhotoNote("");
  };

  const onPickClientProgressPhoto = (file: File | null) => {
    setProgressPhotoPickerBusy(false);
    setPendingClientProgressPhotoFile(file);
    if (file) {
      setNotice(`파일 선택 완료: ${file.name}. 업로드 버튼을 눌러 저장하세요.`);
      return;
    }
    setNotice("파일 선택이 취소되었습니다.");
  };

  const onStartEditProgressPhoto = (photoId: string) => {
    const photo = (clientProgressPhotosQuery.data || []).find((p) => p.id === photoId);
    if (!photo) return;
    setEditingProgressPhotoId(photoId);
    setProgressPhotoEditPhase(photo.phase);
    setProgressPhotoEditNote(photo.note || "");
    setProgressPhotoEditTakenOn(photo.takenOn || "");
  };

  const onSaveEditProgressPhoto = () => {
    if (!selectedMemberId || !editingProgressPhotoId) return;
    updateClientProgressPhotoMutation.mutate({
      clientId: selectedMemberId,
      photoId: editingProgressPhotoId,
      payload: {
        phase: progressPhotoEditPhase,
        note: progressPhotoEditNote || undefined,
        takenOn: progressPhotoEditTakenOn || undefined
      }
    });
  };

  const onDeleteProgressPhoto = (photoId: string) => {
    if (!selectedMemberId) return;
    if (!window.confirm("이 사진을 삭제할까요?")) return;
    deleteClientProgressPhotoMutation.mutate({ clientId: selectedMemberId, photoId });
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
      {notice && (
        <section className="mx-auto mb-4 w-full max-w-7xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </section>
      )}

      <section className="mx-auto mb-4 grid w-full max-w-7xl gap-3 md:grid-cols-[1fr_auto]">
        <Card>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">센터 / 탭</h2>
                <span className="text-[11px] text-slate-500">센터명은 `Ctrl(Cmd)+센터 클릭` 후 칩 안에서 바로 수정/삭제</span>
              </div>
              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={onLogout}>로그아웃</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCenterId("");
                  setEditingCenterId("");
                  setEditingCenterName("");
                }}
                className={`rounded-lg border px-3 py-1.5 text-sm ${!selectedCenterId ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-300 text-slate-600"}`}
              >
                전체
              </button>
              {centerTabs.map((c) =>
                editingCenterId === c.id ? (
                  <form
                    key={c.id}
                    className="flex items-center gap-1 rounded-lg border border-slate-400 bg-slate-100 px-2 py-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSaveCenterInline(c.id);
                    }}
                  >
                    <input
                      className="w-28 border-0 bg-transparent text-sm text-slate-900 outline-none"
                      value={editingCenterName}
                      onChange={(e) => setEditingCenterName(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-700">
                      저장
                    </button>
                    <button type="button" className="rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-700" onClick={() => onDeleteCenterInline(c.id)}>
                      삭제
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-600"
                      onClick={() => {
                        setEditingCenterId("");
                        setEditingCenterName("");
                      }}
                    >
                      취소
                    </button>
                  </form>
                ) : (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => onPickCenter(c.id, e.ctrlKey || e.metaKey)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${selectedCenterId === c.id ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-300 text-slate-600"}`}
                    title="Ctrl/Cmd + 클릭: 센터명 바로 수정"
                  >
                    {c.name}
                  </button>
                )
              )}
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700"
                onClick={() => {
                  setEditingCenterId("");
                  setEditingCenterName("");
                  setShowCenterForm((v) => !v);
                }}
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

        <div className="flex items-center gap-2 self-end text-xs">
          <span className="text-slate-500">화면</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white/80 shadow-sm">
            <button
              type="button"
              className={`px-3 py-1.5 ${activeTab === "lesson" ? "bg-slate-900 text-white" : "text-slate-700"}`}
              onClick={() => setActiveTab("lesson")}
            >
              수업
            </button>
            <button
              type="button"
              className={`border-l border-slate-300 px-3 py-1.5 ${activeTab === "member" ? "bg-slate-900 text-white" : "text-slate-700"}`}
              onClick={() => setActiveTab("member")}
            >
              회원 추적
            </button>
          </div>
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
          <div className="mb-2 flex flex-wrap gap-1 text-xs">
            <button type="button" className={`rounded border px-2 py-0.5 ${memberStatusFilter === "ALL" ? "border-slate-400 bg-slate-100" : "border-slate-300"}`} onClick={() => setMemberStatusFilter("ALL")}>전체</button>
            <button type="button" className={`rounded border px-2 py-0.5 ${memberStatusFilter === "CURRENT" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300"}`} onClick={() => setMemberStatusFilter("CURRENT")}>현재</button>
            <button type="button" className={`rounded border px-2 py-0.5 ${memberStatusFilter === "PAUSED" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300"}`} onClick={() => setMemberStatusFilter("PAUSED")}>휴식</button>
            <button type="button" className={`rounded border px-2 py-0.5 ${memberStatusFilter === "FORMER" ? "border-slate-400 bg-slate-200 text-slate-700" : "border-slate-300"}`} onClick={() => setMemberStatusFilter("FORMER")}>과거</button>
          </div>
          {selectionMode && (
            <div className="mb-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-amber-800">{selectedClientIds.length}명 선택됨</p>
                <button type="button" className="rounded border border-amber-300 px-2 py-0.5 text-amber-700" onClick={endSelectionMode}>
                  선택 모드 종료
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <select className="field" value={bulkCenterId} onChange={(e) => setBulkCenterId(e.target.value)}>
                  <option value="">센터 일괄 이동 선택</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-md border border-amber-300 px-3 py-1.5 text-xs text-amber-700"
                  onClick={applyBulkCenter}
                  disabled={bulkClientUpdateMutation.isPending}
                >
                  센터 일괄 이동
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <select className="field" value={bulkLessonType} onChange={(e) => setBulkLessonType(e.target.value as "" | "PERSONAL" | "GROUP")}>
                  <option value="">기본 수업형태 일괄 변경</option>
                  <option value="PERSONAL">개인</option>
                  <option value="GROUP">그룹</option>
                </select>
                <button
                  type="button"
                  className="rounded-md border border-amber-300 px-3 py-1.5 text-xs text-amber-700"
                  onClick={applyBulkLessonType}
                  disabled={bulkClientUpdateMutation.isPending}
                >
                  수업형태 일괄 변경
                </button>
              </div>
            </div>
          )}

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
            renderRow={(c, index) => (
              <button
                type="button"
                onPointerDown={(e) => onMemberPointerDown(c.id, index, e.pointerType)}
                onPointerUp={clearMemberPointerPress}
                onPointerLeave={clearMemberPointerPress}
                onClick={(e) => onMemberRowClick(c.id, index, e)}
                className={`w-full rounded-lg border px-2 py-1 text-left ${selectedMemberId === c.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white/80"} ${selectedClientIdSet.has(c.id) ? "ring-2 ring-amber-300" : ""}`}
              >
                <p className="flex items-center gap-2 text-sm text-slate-900">
                  {selectionMode && <input type="checkbox" readOnly checked={selectedClientIdSet.has(c.id)} className="h-3.5 w-3.5" />}
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{c.phone || "전화 없음"}</span>
                  <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ${
                    (c.memberStatus || "CURRENT") === "CURRENT"
                      ? "bg-emerald-50 text-emerald-700"
                      : (c.memberStatus || "CURRENT") === "PAUSED"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-200 text-slate-700"
                  }`}>
                    {(c.memberStatus || "CURRENT") === "CURRENT" ? "현재" : (c.memberStatus || "CURRENT") === "PAUSED" ? "휴식" : "과거"}
                  </span>
                </p>
              </button>
            )}
            getKey={(c) => c.id}
          />
          <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-500">
            <HelpChip label="⌘/Ctrl+Click" help="PC에서 Ctrl 또는 Cmd를 누른 채 회원을 클릭하면 다중 선택됩니다." />
            <HelpChip label="Mobile Long Press" help="모바일에서 길게 누르면 다중 선택 모드가 시작됩니다." />
          </div>

          {selectedClient && (
            <div className="mt-3 rounded-lg border border-slate-300 bg-slate-100 p-3 text-xs">
              <p className="mb-2 font-semibold text-slate-900">선택 회원 정보</p>
              <EditableDetailRow label="이름" value={selectedClient.name} active={memberEditField === "name"} onToggle={() => setMemberEditField((prev) => (prev === "name" ? "" : "name"))}>
                <input className="field" value={clientEditDraft.name} onChange={(e) => setClientEditDraft((p) => ({ ...p, name: e.target.value }))} />
              </EditableDetailRow>
              <EditableDetailRow label="센터" value={selectedClientCenterName} active={memberEditField === "centerId"} onToggle={() => setMemberEditField((prev) => (prev === "centerId" ? "" : "centerId"))}>
                <select className="field" value={clientEditDraft.centerId} onChange={(e) => setClientEditDraft((p) => ({ ...p, centerId: e.target.value }))}>
                  <option value="">센터 선택</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </EditableDetailRow>
              <EditableDetailRow label="전화" value={selectedClient.phone || "-"} active={memberEditField === "phone"} onToggle={() => setMemberEditField((prev) => (prev === "phone" ? "" : "phone"))}>
                <input className="field" value={clientEditDraft.phone} onChange={(e) => setClientEditDraft((p) => ({ ...p, phone: e.target.value }))} />
              </EditableDetailRow>
              <EditableDetailRow label="기본 수업형태" value={selectedClient.preferredLessonType === "PERSONAL" ? "개인" : selectedClient.preferredLessonType === "GROUP" ? "그룹" : "-"} active={memberEditField === "preferredLessonType"} onToggle={() => setMemberEditField((prev) => (prev === "preferredLessonType" ? "" : "preferredLessonType"))}>
                <select
                  className="field"
                  value={clientEditDraft.preferredLessonType}
                  onChange={(e) => setClientEditDraft((p) => ({ ...p, preferredLessonType: e.target.value as "" | "PERSONAL" | "GROUP" }))}
                >
                  <option value="">선택 안함</option>
                  <option value="PERSONAL">개인</option>
                  <option value="GROUP">그룹</option>
                </select>
              </EditableDetailRow>
              <EditableDetailRow label="회원 상태" value={selectedClient.memberStatus === "PAUSED" ? "잠시 휴식" : selectedClient.memberStatus === "FORMER" ? "과거 회원" : "현재 회원"} active={memberEditField === "memberStatus"} onToggle={() => setMemberEditField((prev) => (prev === "memberStatus" ? "" : "memberStatus"))}>
                <select
                  className="field"
                  value={clientEditDraft.memberStatus}
                  onChange={(e) => setClientEditDraft((p) => ({ ...p, memberStatus: e.target.value as "CURRENT" | "PAUSED" | "FORMER" }))}
                >
                  <option value="CURRENT">현재 회원</option>
                  <option value="PAUSED">잠시 휴식</option>
                  <option value="FORMER">과거 회원</option>
                </select>
              </EditableDetailRow>
              <EditableDetailRow label="주의사항" value={selectedClient.flagsNote || "-"} active={memberEditField === "flagsNote"} onToggle={() => setMemberEditField((prev) => (prev === "flagsNote" ? "" : "flagsNote"))}>
                <input className="field" value={clientEditDraft.flagsNote} onChange={(e) => setClientEditDraft((p) => ({ ...p, flagsNote: e.target.value }))} />
              </EditableDetailRow>
              <EditableDetailRow label="메모" value={selectedClient.note || "-"} active={memberEditField === "note"} onToggle={() => setMemberEditField((prev) => (prev === "note" ? "" : "note"))}>
                <textarea className="field min-h-16" value={clientEditDraft.note} onChange={(e) => setClientEditDraft((p) => ({ ...p, note: e.target.value }))} />
              </EditableDetailRow>
              <DetailRow label="리포트 수" value={String(reports.length)} />
              {!!memberEditField && (
                <button
                  type="button"
                  className="btn mt-2 w-full"
                  disabled={updateClientMutation.isPending}
                  onClick={onSaveClientInlineField}
                >
                  {updateClientMutation.isPending ? "저장중..." : "회원 정보 저장"}
                </button>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-3">
            {activeLessonForm === "session" && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 md:items-center md:p-4">
              <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/40 bg-white p-4 shadow-2xl md:max-w-4xl md:rounded-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">세션 생성</p>
                <button type="button" className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={() => setActiveLessonForm(null)}>닫기</button>
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
                <div>
                  <p className="mb-1 text-[11px] text-slate-500">그룹 반복</p>
                  <select className="field" name="repeatWeeks" value={sessionRepeatWeeks} onChange={(e) => setSessionRepeatWeeks(Number(e.target.value) as 0 | 4 | 8)}>
                    <option value={0}>반복 없음</option>
                    <option value={4}>앞으로 1달</option>
                    <option value={8}>앞으로 2달</option>
                  </select>
                </div>
                <p className="md:col-span-4 text-[11px] text-slate-500">
                  그룹 선택 시: 멀티선택 회원({selectedClientIds.length}명)에 같은 시간 세션이 일괄 생성됩니다. 멀티선택이 없으면 현재 선택 회원으로 생성됩니다.
                </p>
                <button className="btn md:col-span-4" disabled={createSessionMutation.isPending}>
                  {createSessionMutation.isPending ? "생성중..." : "세션 생성"}
                </button>
              </form>
              </div>
              </div>
            )}
            {activeLessonForm === "work" && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 md:items-center md:p-4">
              <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/40 bg-white p-4 shadow-2xl md:max-w-5xl md:rounded-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{activeWorkPane === "sequence" ? "시퀀스 기록" : "리포트 작성"}</p>
                <button type="button" className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={() => setActiveLessonForm(null)}>닫기</button>
              </div>
              <div className="">
              {activeWorkPane === "sequence" && (
              <section className="space-y-2 rounded-lg border border-cyan-200 bg-cyan-50/40 p-2">
                <p className="text-xs font-semibold text-cyan-800">시퀀스 기록</p>
                <form className="grid gap-2 md:grid-cols-2" onSubmit={onSaveGroupSequence}>
                <div className="md:col-span-2">
                  <p className="mb-1 text-[11px] text-slate-500">연결 세션 (선택 시 수업형태 자동)</p>
                  <select className="field" value={groupDraft.sessionId || ""} onChange={(e) => onChangeSequenceSession(e.target.value)}>
                    <option value="">세션 선택 안함</option>
                    {(sessionsQuery.data || [])
                      .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.date} / {s.startTime || "시간 미입력"} / {s.type === "PERSONAL" ? "개인" : "그룹"} / {clientById[s.clientId]?.name || "회원"} / {toShort(s.memo || "메모 없음", 18)}
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
                <div className="md:col-span-2 rounded-md border border-cyan-200 bg-white/80 p-2">
                  <p className="mb-1 text-[11px] font-semibold text-cyan-800">필라테스 동작 라이브러리 (샘플 + 커스텀)</p>
                  <div className="mb-2 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      className="field"
                      value={sequenceMoveSearch}
                      onChange={(e) => setSequenceMoveSearch(e.target.value)}
                      placeholder="동작 검색 (예: roll, teaser, stretch)"
                    />
                    <button type="button" className="rounded-md border border-slate-300 px-2 text-xs text-slate-700" onClick={() => setSelectedMoveIds([])}>
                      선택 해제
                    </button>
                  </div>
                  <div className="mb-2 grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded border border-slate-200 bg-white p-2 text-xs md:grid-cols-2">
                    {sequenceMoves.map((move) => (
                      <label key={move.id} className="flex items-center gap-2 rounded border border-slate-100 px-2 py-1">
                        <input type="checkbox" checked={selectedMoveIds.includes(move.id)} onChange={() => toggleSequenceMove(move.id)} />
                        <span className="truncate">{move.name}</span>
                        <span className="ml-auto text-[10px] text-slate-500">{move.focus} / {move.level}</span>
                      </label>
                    ))}
                    {!sequenceMoves.length && <p className="text-slate-500">검색 결과가 없습니다.</p>}
                  </div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button type="button" className="rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs text-cyan-700" onClick={() => addSelectedMovesToSequence("today")}>
                      오늘 시퀀스에 추가
                    </button>
                    <button type="button" className="rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs text-cyan-700" onClick={() => addSelectedMovesToSequence("next")}>
                      다음 시퀀스에 추가
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      className="field"
                      value={customMoveInput}
                      onChange={(e) => setCustomMoveInput(e.target.value)}
                      placeholder="커스텀 동작 추가 (예: 사이드 밴드 변형)"
                    />
                    <button type="button" className="rounded-md border border-slate-300 px-2 text-xs text-slate-700" onClick={onAddCustomMove}>
                      커스텀 추가
                    </button>
                  </div>
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
              <section className={`space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2 ${newSessionCue ? "ring-2 ring-yellow-300" : ""}`}>
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
                  {daySessionOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} / {s.type === "PERSONAL" ? "개인" : "그룹"} / {s.startTime || "시간 미입력"} / {clientById[s.clientId]?.name || "회원"} / {toShort(s.memo || "없음", 18)} {s.hasReport ? "(리포트 있음)" : ""}
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
                <FieldWithVoice
                  label="숙제"
                  value={draft.homework}
                  placeholder="숙제"
                  onChange={(v) => setDraft((p) => ({ ...p, homework: v }))}
                  onVoice={() => startVoiceInput("homework")}
                  recording={activeVoiceField === "homework"}
                />
                {previousHomeworkOptions.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] text-slate-500">이전 숙제 선택</p>
                    <select
                      className="field"
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        setDraft((p) => ({ ...p, homework: e.target.value }));
                      }}
                    >
                      <option value="">이전 숙제 불러오기</option>
                      {previousHomeworkOptions.map((item) => (
                        <option key={`homework-draft-${item}`} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-[11px] text-slate-500">숙제 알림 시각 (선택)</p>
                  <DateTimeFieldPicker
                    value={draft.homeworkReminderAt}
                    onChange={(next) => setDraft((p) => ({ ...p, homeworkReminderAt: next }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.homeworkCompleted}
                    onChange={(e) => setDraft((p) => ({ ...p, homeworkCompleted: e.target.checked }))}
                  />
                  숙제 수행 완료 표시
                </label>

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
              </div>
              </div>
            )}

          <section className="grid gap-4 md:grid-cols-2">
            <Card title="세션 타임라인 (리포트+시퀀스)">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">캘린더 시작</span>
                <div className="flex items-center gap-1">
                  <button type="button" className={`rounded border px-2 py-1 ${lessonTypeFilter === "ALL" ? "border-slate-400 bg-slate-100" : "border-slate-300 bg-white"}`} onClick={() => setLessonTypeFilter("ALL")}>전체</button>
                  <button type="button" className={`rounded border px-2 py-1 ${lessonTypeFilter === "PERSONAL" ? "border-slate-400 bg-slate-100" : "border-slate-300 bg-white"}`} onClick={() => setLessonTypeFilter("PERSONAL")}>개인</button>
                  <button type="button" className={`rounded border px-2 py-1 ${lessonTypeFilter === "GROUP" ? "border-slate-400 bg-slate-100" : "border-slate-300 bg-white"}`} onClick={() => setLessonTypeFilter("GROUP")}>그룹</button>
                </div>
                <input
                  type="date"
                  className="field max-w-44 !py-1"
                  value={calendarFocusDate}
                  onChange={(e) => onPickCalendarDate(e.target.value)}
                />
                <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
                  <button type="button" className="px-2 py-1 text-xs text-slate-700" onClick={() => moveCalendar(-1)}>
                    이전 {calendarView === "month" ? "월" : calendarView === "week" ? "주" : "일"}
                  </button>
                  <button type="button" className="border-l border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={() => moveCalendar(1)}>
                    다음 {calendarView === "month" ? "월" : calendarView === "week" ? "주" : "일"}
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" className={`rounded border px-2 py-1 ${calendarView === "month" ? "border-slate-400 bg-slate-100" : "border-slate-300"}`} onClick={() => setCalendarView("month")}>월</button>
                  <button type="button" className={`rounded border px-2 py-1 ${calendarView === "week" ? "border-slate-400 bg-slate-100" : "border-slate-300"}`} onClick={() => setCalendarView("week")}>주</button>
                  <button type="button" className={`rounded border px-2 py-1 ${calendarView === "day" ? "border-slate-400 bg-slate-100" : "border-slate-300"}`} onClick={() => setCalendarView("day")}>일</button>
                </div>
              </div>
              <div className="mb-2 rounded-lg border border-slate-200 bg-white/80 p-2">
                {calendarView === "month" && (
                  <MonthCalendar
                    month={calendarFocusDate.slice(0, 7)}
                    dayStatus={monthDayOverview}
                    selectedDate={calendarFocusDate}
                    onPickDate={onPickCalendarDate}
                  />
                )}
                {calendarView === "week" && (
                  <WeekCalendar
                    startDate={calendarFocusDate}
                    dayStatus={calendarDayOverview}
                    selectedDate={calendarFocusDate}
                    onPickDate={onPickCalendarDate}
                  />
                )}
                {calendarView === "day" && (
                  <div className="space-y-1">
                    {calendarDateKeys.map((date) => (
                      <button
                        key={date}
                        type="button"
                        className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left ${calendarFocusDate === date ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"}`}
                        onClick={(e) => onPickCalendarDate(date, e.ctrlKey || e.metaKey)}
                      >
                        <span className="text-xs font-medium text-slate-800">{date}</span>
                        <span className="text-[11px] text-slate-600">
                          세션 {calendarDayOverview[date]?.total || 0}
                        </span>
                      </button>
                    ))}
                    {!calendarDateKeys.length && <p className="text-xs text-slate-500">선택 범위에 세션이 없습니다.</p>}
                  </div>
                )}
                {calendarQuickOpen && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs">
                    <span className="text-slate-600">{calendarQuickTargetDate}</span>
                    <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700" onClick={() => startQuickAction("session")}>
                      + 세션
                    </button>
                    <button type="button" className="rounded border border-cyan-300 bg-cyan-50 px-2 py-1 text-cyan-700" onClick={() => startQuickAction("sequence")}>
                      ◉ 시퀀스
                    </button>
                    <button type="button" className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700" onClick={() => startQuickAction("report")}>
                      ✎ 리포트
                    </button>
                    <button type="button" className="ml-auto rounded border border-slate-300 bg-white px-2 py-1 text-slate-600" onClick={() => setCalendarQuickOpen(false)}>
                      닫기
                    </button>
                  </div>
                )}
              </div>
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 disabled:opacity-50"
                  disabled={createSessionMutation.isPending || selectedSession?.type !== "GROUP" || !selectedClientIds.length}
                  onClick={onAddMembersToSelectedGroupSession}
                >
                  선택 회원을 현재 그룹 세션 시간에 추가
                </button>
                <span className="text-[11px] text-slate-500">
                  세션 선택 + 멀티선택 회원 {selectedClientIds.length}명
                </span>
              </div>
              <VirtualList
                items={timelineSessions}
                height={timelineSessions.length ? 360 : 180}
                rowHeight={112}
                scrollToKey={timelineScrollTargetId}
                renderRow={(s) => {
                  const report = reportBySessionId[s.id];
                  const seq = sequenceBySessionId[s.id];
                  const active = selectedTimelineSessionId === s.id;
                  const reportFlashing = flashReportSessionId === s.id;
                  const sequenceFlashing = flashSequenceSessionId === s.id;
                  const actionGuide = flashNewSessionActionId === s.id;
                  const reportSelected = active && detailPanelMode === "report" && !!report && selectedReportId === report.id;
                  const sequenceSelected = active && detailPanelMode === "sequence" && !!seq && selectedSequenceDetail?.id === (seq as GroupSequenceLog).id;
                  const homeworkLabel = !report?.homework
                    ? "숙제 없음"
                    : report.homeworkCompleted
                      ? "숙제 완료"
                      : "숙제 미완료";
                  const homeworkClass = !report?.homework
                    ? "border-slate-300 bg-slate-100 text-slate-600"
                    : report.homeworkCompleted
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-amber-300 bg-amber-50 text-amber-700";
                  return (
                    <button
                      type="button"
                      onClick={() => onSelectTimelineSession(s.id)}
                      className={`relative w-full rounded-lg border p-2 text-left transition-all ${active ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white/80"} ${reportFlashing || sequenceFlashing ? "ring-2 ring-emerald-200" : ""}`}
                    >
                      <span className={`absolute right-2 top-2 rounded border px-1.5 py-0.5 text-[10px] ${homeworkClass}`}>{homeworkLabel}</span>
                      <p className="text-sm font-medium text-slate-900">
                        {s.date} {s.startTime || "시간 미입력"} / {s.type === "PERSONAL" ? "개인" : "그룹"}
                      </p>
                      <p className="text-xs text-slate-600">회원: {clientById[s.clientId]?.name || "미확인"}</p>
                      <p className="text-xs text-slate-500">{toShort(s.memo || "메모 없음", 22)}</p>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                        <div className={`rounded ${actionGuide && !seq ? "blink-guide-wrap p-0.5" : ""}`}>
                          <button
                            type="button"
                            className={`w-full rounded border px-1.5 py-1 text-left transition-all ${seq ? "border-cyan-300 bg-cyan-50 text-cyan-700" : "border-slate-300 bg-slate-100 text-slate-600"} ${sequenceFlashing ? "ring-2 ring-cyan-300 shadow-[0_0_0_2px_rgba(34,211,238,0.2)]" : ""} ${sequenceSelected ? "ring-2 ring-cyan-400" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTimelineSequenceAction(s.id, (seq as GroupSequenceLog) || null);
                            }}
                          >
                            시퀀스 {seq ? "보기" : "없음"}
                          </button>
                        </div>
                        <div className={`rounded ${actionGuide && !report ? "blink-guide-wrap p-0.5" : ""}`}>
                          <button
                            type="button"
                            className={`w-full rounded border px-1.5 py-1 text-left transition-all ${report ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-100 text-slate-600"} ${reportFlashing ? "ring-2 ring-emerald-300 shadow-[0_0_0_2px_rgba(52,211,153,0.2)]" : ""} ${reportSelected ? "ring-2 ring-emerald-400" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTimelineReportAction(s.id, report || null);
                            }}
                          >
                            리포트 {report ? "보기" : "없음"}
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                }}
                getKey={(s) => s.id}
              />
              <p className="mt-2 text-xs text-slate-500">해당 날짜의 전체 세션이 시간순으로 표시됩니다. 세션 클릭 시 해당 회원이 자동 선택됩니다.</p>
              {!timelineSessions.length && <p className="mt-1 text-xs text-slate-500">이 날짜에 등록된 세션이 없습니다.</p>}
            </Card>

            <Card title="기록 상세">
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
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    onClick={() => setShowSequenceEditForm((v) => !v)}
                  >
                    {showSequenceEditForm ? "수정 취소" : "시퀀스 수정"}
                  </button>
                  {showSequenceEditForm && (
                    <form className="space-y-2 rounded-md border border-slate-300 bg-white/80 p-2" onSubmit={onUpdateSequence}>
                      <p className="text-[11px] font-semibold text-slate-500">시퀀스 수정</p>
                      <p className="text-[11px] text-slate-500">기구 종류</p>
                      <input
                        className="field"
                        value={sequenceEditDraft.equipmentType}
                        onChange={(e) => setSequenceEditDraft((p) => ({ ...p, equipmentType: e.target.value }))}
                        placeholder="기구 종류"
                      />
                      <p className="text-[11px] text-slate-500">기구 브랜드</p>
                      <input
                        className="field"
                        value={sequenceEditDraft.equipmentBrand}
                        onChange={(e) => setSequenceEditDraft((p) => ({ ...p, equipmentBrand: e.target.value }))}
                        placeholder="기구 브랜드"
                      />
                      <p className="text-[11px] text-slate-500">스프링 세팅</p>
                      <input
                        className="field"
                        value={sequenceEditDraft.springSetting}
                        onChange={(e) => setSequenceEditDraft((p) => ({ ...p, springSetting: e.target.value }))}
                        placeholder="스프링 세팅"
                      />
                      <p className="text-[11px] text-slate-500">오늘 시퀀스</p>
                      <textarea
                        className="field min-h-16"
                        value={sequenceEditDraft.todaySequence}
                        onChange={(e) => setSequenceEditDraft((p) => ({ ...p, todaySequence: e.target.value }))}
                        placeholder="오늘 시퀀스"
                      />
                      <p className="text-[11px] text-slate-500">다음 시퀀스</p>
                      <textarea
                        className="field min-h-16"
                        value={sequenceEditDraft.nextSequence}
                        onChange={(e) => setSequenceEditDraft((p) => ({ ...p, nextSequence: e.target.value }))}
                        placeholder="다음 시퀀스"
                      />
                      <button className="btn w-full" disabled={updateGroupSequenceMutation.isPending}>
                        {updateGroupSequenceMutation.isPending ? "수정중..." : "시퀀스 수정 저장"}
                      </button>
                    </form>
                  )}
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
                  <EditableDetailRow label="요약" value={selectedReport.summaryItems || "-"} active={reportEditField === "summaryItems"} onToggle={() => setReportEditField((prev) => (prev === "summaryItems" ? "" : "summaryItems"))}>
                    <input className="field" value={reportEditDraft.summaryItems} onChange={(e) => setReportEditDraft((p) => ({ ...p, summaryItems: e.target.value }))} />
                  </EditableDetailRow>
                  <EditableDetailRow label="잘된 점" value={selectedReport.strengthNote || "-"} active={reportEditField === "strengthNote"} onToggle={() => setReportEditField((prev) => (prev === "strengthNote" ? "" : "strengthNote"))}>
                    <input className="field" value={reportEditDraft.strengthNote} onChange={(e) => setReportEditDraft((p) => ({ ...p, strengthNote: e.target.value }))} />
                  </EditableDetailRow>
                  <EditableDetailRow label="보완점" value={selectedReport.improveNote || "-"} active={reportEditField === "improveNote"} onToggle={() => setReportEditField((prev) => (prev === "improveNote" ? "" : "improveNote"))}>
                    <input className="field" value={reportEditDraft.improveNote} onChange={(e) => setReportEditDraft((p) => ({ ...p, improveNote: e.target.value }))} />
                  </EditableDetailRow>
                  <EditableDetailRow label="다음 목표" value={selectedReport.nextGoal || "-"} active={reportEditField === "nextGoal"} onToggle={() => setReportEditField((prev) => (prev === "nextGoal" ? "" : "nextGoal"))}>
                    <input className="field" value={reportEditDraft.nextGoal} onChange={(e) => setReportEditDraft((p) => ({ ...p, nextGoal: e.target.value }))} />
                  </EditableDetailRow>
                  <EditableDetailRow label="숙제" value={selectedReport.homework || "-"} active={reportEditField === "homework"} onToggle={() => setReportEditField((prev) => (prev === "homework" ? "" : "homework"))}>
                    <div className="space-y-2">
                      <input className="field" value={reportEditDraft.homework} onChange={(e) => setReportEditDraft((p) => ({ ...p, homework: e.target.value }))} />
                      {previousHomeworkOptions.length > 0 && (
                        <select
                          className="field"
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            setReportEditDraft((p) => ({ ...p, homework: e.target.value }));
                          }}
                        >
                          <option value="">이전 숙제 불러오기</option>
                          {previousHomeworkOptions.map((item) => (
                            <option key={`homework-edit-${item}`} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </EditableDetailRow>
                  <EditableDetailRow label="숙제 알림" value={formatNullableDateTime(selectedReport.homeworkReminderAt)} active={reportEditField === "homeworkReminderAt"} onToggle={() => setReportEditField((prev) => (prev === "homeworkReminderAt" ? "" : "homeworkReminderAt"))}>
                    <DateTimeFieldPicker
                      value={reportEditDraft.homeworkReminderAt}
                      onChange={(next) => setReportEditDraft((p) => ({ ...p, homeworkReminderAt: next }))}
                    />
                  </EditableDetailRow>
                  <EditableDetailRow label="숙제 완료" value={selectedReport.homeworkCompleted ? "완료" : "미완료"} active={reportEditField === "homeworkCompleted"} onToggle={() => setReportEditField((prev) => (prev === "homeworkCompleted" ? "" : "homeworkCompleted"))}>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={reportEditDraft.homeworkCompleted}
                        onChange={(e) => setReportEditDraft((p) => ({ ...p, homeworkCompleted: e.target.checked }))}
                      />
                      숙제 수행 완료 표시
                    </label>
                  </EditableDetailRow>
                  {!!reportEditField && (
                    <button className="btn w-full" disabled={updateReportMutation.isPending} onClick={onSaveReportInlineField} type="button">
                      {updateReportMutation.isPending ? "수정중..." : "리포트 수정 저장"}
                    </button>
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
          <div className="mb-2 flex flex-wrap gap-1 text-xs">
            <button type="button" className={`rounded border px-2 py-0.5 ${memberStatusFilter === "ALL" ? "border-slate-400 bg-slate-100" : "border-slate-300"}`} onClick={() => setMemberStatusFilter("ALL")}>전체</button>
            <button type="button" className={`rounded border px-2 py-0.5 ${memberStatusFilter === "CURRENT" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300"}`} onClick={() => setMemberStatusFilter("CURRENT")}>현재</button>
            <button type="button" className={`rounded border px-2 py-0.5 ${memberStatusFilter === "PAUSED" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300"}`} onClick={() => setMemberStatusFilter("PAUSED")}>휴식</button>
            <button type="button" className={`rounded border px-2 py-0.5 ${memberStatusFilter === "FORMER" ? "border-slate-400 bg-slate-200 text-slate-700" : "border-slate-300"}`} onClick={() => setMemberStatusFilter("FORMER")}>과거</button>
          </div>
          <VirtualList
            items={filteredClients}
            height={memberListHeight}
            rowHeight={memberListRowHeight}
            renderRow={(c, index) => (
              <button
                type="button"
                onPointerDown={(e) => onMemberPointerDown(c.id, index, e.pointerType)}
                onPointerUp={clearMemberPointerPress}
                onPointerLeave={clearMemberPointerPress}
                onClick={(e) => onMemberRowClick(c.id, index, e)}
                className={`w-full rounded-lg border px-2 py-1 text-left ${selectedMemberId === c.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white/80"} ${selectedClientIdSet.has(c.id) ? "ring-2 ring-amber-300" : ""}`}
              >
                <p className="flex items-center gap-2 text-sm text-slate-900">
                  {selectionMode && <input type="checkbox" readOnly checked={selectedClientIdSet.has(c.id)} className="h-3.5 w-3.5" />}
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{c.phone || "전화 없음"}</span>
                  <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ${
                    (c.memberStatus || "CURRENT") === "CURRENT"
                      ? "bg-emerald-50 text-emerald-700"
                      : (c.memberStatus || "CURRENT") === "PAUSED"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-200 text-slate-700"
                  }`}>
                    {(c.memberStatus || "CURRENT") === "CURRENT" ? "현재" : (c.memberStatus || "CURRENT") === "PAUSED" ? "휴식" : "과거"}
                  </span>
                </p>
              </button>
            )}
            getKey={(c) => c.id}
          />
          {selectedClient && (
            <div className="mt-3 rounded-lg border border-slate-300 bg-slate-100 p-3 text-xs">
              <p className="mb-2 font-semibold text-slate-900">선택 회원 정보</p>
              <EditableDetailRow label="이름" value={selectedClient.name} active={memberEditField === "name"} onToggle={() => setMemberEditField((prev) => (prev === "name" ? "" : "name"))}>
                <input className="field" value={clientEditDraft.name} onChange={(e) => setClientEditDraft((p) => ({ ...p, name: e.target.value }))} />
              </EditableDetailRow>
              <EditableDetailRow label="센터" value={selectedClientCenterName} active={memberEditField === "centerId"} onToggle={() => setMemberEditField((prev) => (prev === "centerId" ? "" : "centerId"))}>
                <select className="field" value={clientEditDraft.centerId} onChange={(e) => setClientEditDraft((p) => ({ ...p, centerId: e.target.value }))}>
                  <option value="">센터 선택</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </EditableDetailRow>
              <EditableDetailRow label="전화" value={selectedClient.phone || "-"} active={memberEditField === "phone"} onToggle={() => setMemberEditField((prev) => (prev === "phone" ? "" : "phone"))}>
                <input className="field" value={clientEditDraft.phone} onChange={(e) => setClientEditDraft((p) => ({ ...p, phone: e.target.value }))} />
              </EditableDetailRow>
              <EditableDetailRow label="기본 수업형태" value={selectedClient.preferredLessonType === "PERSONAL" ? "개인" : selectedClient.preferredLessonType === "GROUP" ? "그룹" : "-"} active={memberEditField === "preferredLessonType"} onToggle={() => setMemberEditField((prev) => (prev === "preferredLessonType" ? "" : "preferredLessonType"))}>
                <select
                  className="field"
                  value={clientEditDraft.preferredLessonType}
                  onChange={(e) => setClientEditDraft((p) => ({ ...p, preferredLessonType: e.target.value as "" | "PERSONAL" | "GROUP" }))}
                >
                  <option value="">선택 안함</option>
                  <option value="PERSONAL">개인</option>
                  <option value="GROUP">그룹</option>
                </select>
              </EditableDetailRow>
              <EditableDetailRow label="회원 상태" value={selectedClient.memberStatus === "PAUSED" ? "잠시 휴식" : selectedClient.memberStatus === "FORMER" ? "과거 회원" : "현재 회원"} active={memberEditField === "memberStatus"} onToggle={() => setMemberEditField((prev) => (prev === "memberStatus" ? "" : "memberStatus"))}>
                <select
                  className="field"
                  value={clientEditDraft.memberStatus}
                  onChange={(e) => setClientEditDraft((p) => ({ ...p, memberStatus: e.target.value as "CURRENT" | "PAUSED" | "FORMER" }))}
                >
                  <option value="CURRENT">현재 회원</option>
                  <option value="PAUSED">잠시 휴식</option>
                  <option value="FORMER">과거 회원</option>
                </select>
              </EditableDetailRow>
              <EditableDetailRow label="주의사항" value={selectedClient.flagsNote || "-"} active={memberEditField === "flagsNote"} onToggle={() => setMemberEditField((prev) => (prev === "flagsNote" ? "" : "flagsNote"))}>
                <input className="field" value={clientEditDraft.flagsNote} onChange={(e) => setClientEditDraft((p) => ({ ...p, flagsNote: e.target.value }))} />
              </EditableDetailRow>
              <DetailRow label="아픈 부위/증상" value={clientProfileQuery.data?.painNote || "-"} />
              <DetailRow label="목표" value={clientProfileQuery.data?.goalNote || "-"} />
              <DetailRow label="수술 이력" value={clientProfileQuery.data?.surgeryHistory || "-"} />
              <EditableDetailRow label="메모" value={selectedClient.note || "-"} active={memberEditField === "note"} onToggle={() => setMemberEditField((prev) => (prev === "note" ? "" : "note"))}>
                <textarea className="field min-h-16" value={clientEditDraft.note} onChange={(e) => setClientEditDraft((p) => ({ ...p, note: e.target.value }))} />
              </EditableDetailRow>
              {!!memberEditField && (
                <button
                  type="button"
                  className="btn mt-2 w-full"
                  disabled={updateClientMutation.isPending}
                  onClick={onSaveClientInlineField}
                >
                  {updateClientMutation.isPending ? "저장중..." : "회원 정보 저장"}
                </button>
              )}
            </div>
          )}
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
              <button className="btn md:col-span-2" disabled={!selectedMemberId}>회원 추적 저장</button>
            </form>
            {selectedMemberId && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white/80 p-2 text-xs">
                <p className="mb-1 font-semibold text-slate-700">현재 저장값</p>
                <DetailRow label="아픈 부위/증상" value={clientProfileQuery.data?.painNote || "-"} />
                <DetailRow label="목표" value={clientProfileQuery.data?.goalNote || "-"} />
                <DetailRow label="수술 이력" value={clientProfileQuery.data?.surgeryHistory || "-"} />
                <DetailRow label="수업 전 메모" value={clientProfileQuery.data?.beforeClassMemo || "-"} />
                <DetailRow label="수업 후 기록" value={clientProfileQuery.data?.afterClassMemo || "-"} />
                <DetailRow label="다음 레슨 계획" value={clientProfileQuery.data?.nextLessonPlan || "-"} />
              </div>
            )}
          </Card>

          <Card title="개인 기록 타임라인 (추적)">
            <VirtualList
              items={historyEntries}
              height={240}
              rowHeight={76}
              renderRow={(entry) => (
                <button
                  type="button"
                  className={`w-full rounded-lg border p-2 text-left ${selectedHistoryKey === entry.key ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white/80"}`}
                  onClick={() => setSelectedHistoryKey((prev) => (prev === entry.key ? "" : entry.key))}
                >
                  <p className="text-xs font-semibold text-slate-800">
                    회원 추적 | {formatDateTime(entry.createdAt)}
                  </p>
                  <p className="truncate text-xs text-slate-600">{entry.summary}</p>
                </button>
              )}
              getKey={(entry) => entry.key}
            />
            {!selectedMemberId && <p className="mt-2 text-xs text-slate-500">회원을 선택하면 기록이 표시됩니다.</p>}
            {!!selectedMemberId && !historyEntries.length && <p className="mt-2 text-xs text-slate-500">저장된 기록이 없습니다.</p>}

            {selectedHistoryEntry && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white/80 p-3 text-xs">
                <p className="mb-2 font-semibold text-slate-800">회원 추적 상세</p>
                <DetailRow label="기록일" value={formatDateTime(selectedHistoryEntry.createdAt)} />
                <DetailRow label="증상" value={(selectedHistoryEntry.detail as { painNote?: string }).painNote || "-"} />
                <DetailRow label="목표" value={(selectedHistoryEntry.detail as { goalNote?: string }).goalNote || "-"} />
                <DetailRow label="수술 이력" value={(selectedHistoryEntry.detail as { surgeryHistory?: string }).surgeryHistory || "-"} />
                <DetailRow label="수업 전 메모" value={(selectedHistoryEntry.detail as { beforeClassMemo?: string }).beforeClassMemo || "-"} />
                <DetailRow label="수업 후 기록" value={(selectedHistoryEntry.detail as { afterClassMemo?: string }).afterClassMemo || "-"} />
                <DetailRow label="다음 레슨 계획" value={(selectedHistoryEntry.detail as { nextLessonPlan?: string }).nextLessonPlan || "-"} />
              </div>
            )}
          </Card>

          <Card title="비포/애프터 사진">
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <section
                className="rounded-lg border border-slate-200 bg-white/70 p-2 cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("button,input,select,textarea")) return;
                  setProgressPhotoPhase("BEFORE");
                  setShowProgressPhotoUploadModal(true);
                }}
              >
                <p className="mb-2 text-xs font-semibold text-slate-700">비포</p>
                <div className="grid grid-cols-2 gap-2">
                  {beforeProgressPhotos.map((p) => (
                    <div key={p.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white/80">
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelectedPhotoPreview(clientProgressPhotoUrls[p.id] || p.imageUrl)}
                      >
                        <img src={clientProgressPhotoUrls[p.id] || p.imageUrl} alt={p.fileName} className="h-24 w-full object-cover" />
                      </button>
                      <div className="space-y-1 p-2">
                        <p className="text-[11px] text-slate-500">{p.takenOn || "-"}</p>
                        {editingProgressPhotoId === p.id ? (
                          <div className="space-y-1">
                            <select className="field !py-1 text-xs" value={progressPhotoEditPhase} onChange={(e) => setProgressPhotoEditPhase(e.target.value as "BEFORE" | "AFTER" | "ETC")}>
                              <option value="BEFORE">비포</option>
                              <option value="AFTER">애프터</option>
                              <option value="ETC">기타</option>
                            </select>
                            <input className="field !py-1 text-xs" type="date" value={progressPhotoEditTakenOn} onChange={(e) => setProgressPhotoEditTakenOn(e.target.value)} />
                            <input className="field !py-1 text-xs" value={progressPhotoEditNote} onChange={(e) => setProgressPhotoEditNote(e.target.value)} placeholder="메모" />
                            <div className="flex gap-1">
                              <button type="button" className="rounded border border-slate-300 px-2 py-0.5 text-[11px]" onClick={onSaveEditProgressPhoto} disabled={updateClientProgressPhotoMutation.isPending}>
                                저장
                              </button>
                              <button type="button" className="rounded border border-slate-300 px-2 py-0.5 text-[11px]" onClick={() => setEditingProgressPhotoId("")}>
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button type="button" className="rounded border border-slate-300 px-2 py-0.5 text-[11px]" onClick={() => onStartEditProgressPhoto(p.id)}>
                              수정
                            </button>
                            <button type="button" className="rounded border border-rose-300 px-2 py-0.5 text-[11px] text-rose-700" onClick={() => onDeleteProgressPhoto(p.id)} disabled={deleteClientProgressPhotoMutation.isPending}>
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {!beforeProgressPhotos.length && <p className="text-[11px] text-slate-500">비포 사진이 없습니다.</p>}
              </section>
              <section
                className="rounded-lg border border-slate-200 bg-white/70 p-2 cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("button,input,select,textarea")) return;
                  setProgressPhotoPhase("AFTER");
                  setShowProgressPhotoUploadModal(true);
                }}
              >
                <p className="mb-2 text-xs font-semibold text-slate-700">애프터</p>
                <div className="grid grid-cols-2 gap-2">
                  {afterProgressPhotos.map((p) => (
                    <div key={p.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white/80">
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelectedPhotoPreview(clientProgressPhotoUrls[p.id] || p.imageUrl)}
                      >
                        <img src={clientProgressPhotoUrls[p.id] || p.imageUrl} alt={p.fileName} className="h-24 w-full object-cover" />
                      </button>
                      <div className="space-y-1 p-2">
                        <p className="text-[11px] text-slate-500">{p.takenOn || "-"}</p>
                        {editingProgressPhotoId === p.id ? (
                          <div className="space-y-1">
                            <select className="field !py-1 text-xs" value={progressPhotoEditPhase} onChange={(e) => setProgressPhotoEditPhase(e.target.value as "BEFORE" | "AFTER" | "ETC")}>
                              <option value="BEFORE">비포</option>
                              <option value="AFTER">애프터</option>
                              <option value="ETC">기타</option>
                            </select>
                            <input className="field !py-1 text-xs" type="date" value={progressPhotoEditTakenOn} onChange={(e) => setProgressPhotoEditTakenOn(e.target.value)} />
                            <input className="field !py-1 text-xs" value={progressPhotoEditNote} onChange={(e) => setProgressPhotoEditNote(e.target.value)} placeholder="메모" />
                            <div className="flex gap-1">
                              <button type="button" className="rounded border border-slate-300 px-2 py-0.5 text-[11px]" onClick={onSaveEditProgressPhoto} disabled={updateClientProgressPhotoMutation.isPending}>
                                저장
                              </button>
                              <button type="button" className="rounded border border-slate-300 px-2 py-0.5 text-[11px]" onClick={() => setEditingProgressPhotoId("")}>
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button type="button" className="rounded border border-slate-300 px-2 py-0.5 text-[11px]" onClick={() => onStartEditProgressPhoto(p.id)}>
                              수정
                            </button>
                            <button type="button" className="rounded border border-rose-300 px-2 py-0.5 text-[11px] text-rose-700" onClick={() => onDeleteProgressPhoto(p.id)} disabled={deleteClientProgressPhotoMutation.isPending}>
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {!afterProgressPhotos.length && <p className="text-[11px] text-slate-500">애프터 사진이 없습니다.</p>}
              </section>
            </div>
            {!!etcProgressPhotos.length && (
              <section className="mt-3 rounded-lg border border-slate-200 bg-white/70 p-2">
                <p className="mb-2 text-xs font-semibold text-slate-700">기타</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {etcProgressPhotos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white/80 text-left"
                      onClick={() => setSelectedPhotoPreview(clientProgressPhotoUrls[p.id] || p.imageUrl)}
                    >
                      <img src={clientProgressPhotoUrls[p.id] || p.imageUrl} alt={p.fileName} className="h-24 w-full object-cover" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </Card>
        </div>
      </section>
      )}

      {showProgressPhotoUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="button"
          tabIndex={0}
          onClick={() => setShowProgressPhotoUploadModal(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setShowProgressPhotoUploadModal(false);
          }}
        >
          <div className="w-full max-w-2xl rounded-xl border border-white/40 bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
            <p className="mb-3 text-sm font-semibold text-slate-900">비포/애프터 사진 등록</p>
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
              <input
                key={clientProgressPhotoInputKey}
                name="clientProgressPhoto"
                type="file"
                accept="image/*"
                className="field md:col-span-3"
                onClick={() => {
                  setProgressPhotoPickerBusy(true);
                  setNotice("파일 선택창 여는 중...");
                }}
                onBlur={() => setProgressPhotoPickerBusy(false)}
                onChange={(e) => onPickClientProgressPhoto(e.currentTarget.files?.[0] || null)}
              />
              <button className="btn md:col-span-1" disabled={uploadClientProgressPhotoMutation.isPending || !selectedMemberId}>
                {uploadClientProgressPhotoMutation.isPending ? "업로드중..." : "사진 업로드"}
              </button>
              <p className="md:col-span-4 text-[11px] text-slate-500">
                {progressPhotoPickerBusy
                  ? "파일 선택창 처리 중..."
                  : pendingClientProgressPhotoFile
                    ? `선택 파일: ${pendingClientProgressPhotoFile.name}`
                    : "파일을 선택하면 여기 표시됩니다."}
              </p>
              <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 md:col-span-4" onClick={() => setShowProgressPhotoUploadModal(false)}>
                닫기
              </button>
            </form>
          </div>
        </div>
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

      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 rounded-full border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-lg md:hidden"
        onClick={() => {
          setCalendarQuickTargetDate(sessionDate);
          setCalendarQuickOpen(true);
        }}
      >
        + 빠른기록
      </button>

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

function HelpChip({ label, help }: { label: string; help: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className="relative rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
    >
      {label}
      {open && (
        <span className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-56 -translate-x-1/2 rounded-xl border border-white/70 bg-white/95 p-3 text-left text-xs text-slate-700 shadow-2xl backdrop-blur-md">
          {help}
        </span>
      )}
    </button>
  );
}

function VirtualList<T>({
  items,
  height,
  rowHeight,
  overscan = 4,
  scrollToKey,
  renderRow,
  getKey
}: {
  items: T[];
  height: number;
  rowHeight: number;
  overscan?: number;
  scrollToKey?: string;
  renderRow: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const totalHeight = items.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(items.length, Math.ceil((scrollTop + height) / rowHeight) + overscan);
  const visible = items.slice(start, end);

  useEffect(() => {
    if (!scrollToKey || !containerRef.current) return;
    const idx = items.findIndex((item, index) => getKey(item, index) === scrollToKey);
    if (idx < 0) return;
    const top = idx * rowHeight;
    const bottom = top + rowHeight;
    const viewTop = containerRef.current.scrollTop;
    const viewBottom = viewTop + height;
    if (top >= viewTop && bottom <= viewBottom) return;
    const nextTop = Math.max(0, top - Math.floor(height / 2 - rowHeight / 2));
    containerRef.current.scrollTop = nextTop;
    setScrollTop(nextTop);
  }, [scrollToKey, items, rowHeight, height, getKey]);

  return (
    <div ref={containerRef} className="overflow-y-auto pr-1" style={{ height }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
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

function MonthCalendar({
  month,
  dayStatus,
  selectedDate,
  onPickDate
}: {
  month: string;
  dayStatus: Record<string, { total: number; missingSequence: boolean; missingReport: boolean }>;
  selectedDate: string;
  onPickDate: (date: string, openQuick?: boolean) => void;
}) {
  const [year, monthNum] = month.split("-").map(Number);
  const first = new Date(year, (monthNum || 1) - 1, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, monthNum || 1, 0).getDate();
  const cellCount = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, idx) => {
    const day = idx - startWeekday + 1;
    if (day < 1 || day > daysInMonth) return null;
    const date = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { day, date, status: dayStatus[date] };
  });

  return (
    <div className="grid grid-cols-7 gap-0.5">
      {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
        <p key={w} className="px-1 py-0.5 text-center text-[10px] font-semibold text-slate-500">{w}</p>
      ))}
      {cells.map((cell, idx) => (
        <div key={`${month}-${idx}`} className="min-h-[62px]">
          {!cell ? <div className="h-full rounded border border-transparent" /> : (
            <button
              type="button"
              className={`h-full w-full rounded border px-1 py-0.5 text-left ${selectedDate === cell.date ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"}`}
              onClick={(e) => onPickDate(cell.date, e.ctrlKey || e.metaKey)}
            >
              <p className="text-xs font-semibold text-slate-800">{cell.day}</p>
              {cell.status && (
                <div className="mt-1 space-y-1">
                  <span className="inline-flex rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9px] text-sky-700">{cell.status.total} 세션</span>
                  <div className="flex items-center gap-1">
                    {cell.status.missingSequence && <span title="시퀀스 미등록 세션 있음" className="h-2 w-2 rounded-full bg-emerald-400" />}
                    {cell.status.missingReport && <span title="리포트 미등록 세션 있음" className="h-2 w-2 rounded-full bg-amber-400" />}
                  </div>
                </div>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function WeekCalendar({
  startDate,
  dayStatus,
  selectedDate,
  onPickDate
}: {
  startDate: string;
  dayStatus: Record<string, { total: number; missingSequence: boolean; missingReport: boolean }>;
  selectedDate: string;
  onPickDate: (date: string, openQuick?: boolean) => void;
}) {
  const start = startOfWeek(startDate);
  const cells = Array.from({ length: 7 }, (_, idx) => {
    const date = shiftDay(start, idx);
    return { date, day: Number(date.slice(8, 10)), status: dayStatus[date] };
  });
  return (
    <div className="grid grid-cols-7 gap-1">
      {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
        <p key={`week-head-${w}`} className="px-1 py-0.5 text-center text-[10px] font-semibold text-slate-500">{w}</p>
      ))}
      {cells.map((cell) => (
        <button
          key={cell.date}
          type="button"
          className={`min-h-[72px] rounded border px-1.5 py-1 text-left ${selectedDate === cell.date ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"}`}
          onClick={(e) => onPickDate(cell.date, e.ctrlKey || e.metaKey)}
        >
          <p className="text-xs font-semibold text-slate-800">{cell.day}</p>
          {cell.status ? (
            <div className="mt-1 space-y-1">
              <span className="inline-flex rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9px] text-sky-700">{cell.status.total} 세션</span>
              <div className="flex items-center gap-1">
                {cell.status.missingSequence && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                {cell.status.missingReport && <span className="h-2 w-2 rounded-full bg-amber-400" />}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-slate-400">세션 없음</p>
          )}
        </button>
      ))}
    </div>
  );
}

function getMonthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, (m || 1) - 1, 1);
  const end = new Date(y, m || 1, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(start), to: fmt(end) };
}

function getWeekRange(date: string) {
  const start = startOfWeek(date);
  return { from: start, to: shiftDay(start, 6) };
}

function startOfWeek(date: string) {
  const base = new Date(date);
  if (Number.isNaN(base.getTime())) return date;
  const day = base.getDay();
  const start = new Date(base);
  start.setDate(base.getDate() - day);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

function shiftDay(date: string, amount: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftMonth(month: string, amount: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + amount, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

function DateTimeFieldPicker({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const now = useMemo(() => splitLocalDateTime(currentLocalDateTimeRounded10())!, []);
  const parsed = splitLocalDateTime(value) || now;
  const currentYear = now.year;
  const yearOptions = useMemo(() => {
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);
    if (!years.includes(parsed.year)) years.push(parsed.year);
    return years.sort((a, b) => a - b);
  }, [currentYear, parsed.year]);
  const dayMax = getDaysInMonth(parsed.year, parsed.month);
  const dayOptions = Array.from({ length: dayMax }, (_, i) => i + 1);
  const normalizedMinute = MINUTE_OPTIONS.includes(parsed.minute)
    ? parsed.minute
    : MINUTE_OPTIONS[Math.floor(Number(parsed.minute || "0") / 10)] || "00";
  const normalized: LocalDateTimeParts = {
    ...parsed,
    day: Math.min(parsed.day, dayMax),
    minute: normalizedMinute
  };

  const update = (patch: Partial<LocalDateTimeParts>) => {
    const nextRaw: LocalDateTimeParts = { ...normalized, ...patch };
    const nextDayMax = getDaysInMonth(nextRaw.year, nextRaw.month);
    const next: LocalDateTimeParts = {
      ...nextRaw,
      day: Math.min(nextRaw.day, nextDayMax),
      minute: MINUTE_OPTIONS.includes(nextRaw.minute) ? nextRaw.minute : "00"
    };
    onChange(joinLocalDateTime(next));
  };

  return (
    <div className="grid grid-cols-5 gap-2">
        <select className="field !py-2" value={String(normalized.year)} onChange={(e) => update({ year: Number(e.target.value) })}>
          {yearOptions.map((year) => (
            <option key={`year-${year}`} value={year}>
              {year}년
            </option>
          ))}
        </select>
        <select className="field !py-2" value={String(normalized.month)} onChange={(e) => update({ month: Number(e.target.value) })}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <option key={`month-${month}`} value={month}>
              {month}월
            </option>
          ))}
        </select>
        <select className="field !py-2" value={String(normalized.day)} onChange={(e) => update({ day: Number(e.target.value) })}>
          {dayOptions.map((day) => (
            <option key={`day-${day}`} value={day}>
              {day}일
            </option>
          ))}
        </select>
        <select className="field !py-2" value={normalized.hour} onChange={(e) => update({ hour: e.target.value })}>
          {HOUR_OPTIONS.map((hour) => (
            <option key={`hour-${hour}`} value={hour}>
              {hour}시
            </option>
          ))}
        </select>
        <select className="field !py-2" value={normalized.minute} onChange={(e) => update({ minute: e.target.value })}>
          {MINUTE_OPTIONS.map((minute) => (
            <option key={`minute-${minute}`} value={minute}>
              {minute}분
            </option>
          ))}
        </select>
    </div>
  );
}

function EditableDetailRow({
  label,
  value,
  active,
  onToggle,
  children
}: {
  label: string;
  value: string;
  active: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`mb-1 rounded-md border p-1.5 ${active ? "border-cyan-300 bg-cyan-50/60" : "border-slate-200 bg-white/70"}`}>
      <div className="flex w-full items-center gap-2">
        <button type="button" className="shrink-0 font-medium text-slate-700" onClick={onToggle}>
          {label}:
        </button>
        {!active && (
          <button type="button" className="min-w-0 flex-1 truncate text-left text-slate-600" onClick={onToggle}>
            {value}
          </button>
        )}
        {active && <div className="min-w-0 flex-1">{children}</div>}
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

function splitLocalDateTime(value?: string | null): LocalDateTimeParts | null {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":");
  if (!year || !month || !day || hour == null || minute == null) return null;
  return {
    year,
    month,
    day,
    hour: String(Number(hour)).padStart(2, "0"),
    minute: String(Number(minute)).padStart(2, "0")
  };
}

function joinLocalDateTime(parts: LocalDateTimeParts) {
  const yyyy = String(parts.year);
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  const hh = String(Number(parts.hour)).padStart(2, "0");
  const mi = String(Number(parts.minute)).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function toIsoFromLocalDateTime(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function toLocalDateTimeInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function currentLocalDateTimeRounded10() {
  const now = new Date();
  const roundedMinute = Math.floor(now.getMinutes() / 10) * 10;
  now.setMinutes(roundedMinute, 0, 0);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatNullableDateTime(value?: string | null) {
  if (!value) return "-";
  return formatDateTime(value);
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

function mergeSequenceLines(base: string, additions: string[]) {
  const existing = base
    .split("\n")
    .map((line) => line.trim().replace(/^\d+\.\s*/, ""))
    .filter(Boolean);
  const merged = Array.from(new Set([...existing, ...additions.map((x) => x.trim()).filter(Boolean)]));
  return merged.map((item, idx) => `${idx + 1}. ${item}`).join("\n");
}

function summarizeDayOverview(
  sessions: Array<{ id: string; date: string; hasReport: boolean }>,
  sequenceBySessionId: Record<string, unknown>
) {
  return sessions.reduce<Record<string, { total: number; missingSequence: boolean; missingReport: boolean }>>((acc, s) => {
    const cur = acc[s.date] || { total: 0, missingSequence: false, missingReport: false };
    cur.total += 1;
    if (!sequenceBySessionId[s.id]) cur.missingSequence = true;
    if (!s.hasReport) cur.missingReport = true;
    acc[s.date] = cur;
    return acc;
  }, {});
}
