import { api } from "./client";
import type {
  Center,
  Client,
  ClientProfile,
  ClientProgressPhoto,
  GroupSequenceTemplate,
  GroupSequence,
  Homework,
  LoginResponse,
  PublicShare,
  Report,
  ReportPhoto,
  Session,
  SessionWithReport,
  ShareResponse
} from "../types/api";

export const login = async (username: string, password: string) => {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/login", { username, password });
  return data;
};

export const health = async () => {
  const { data } = await api.get("/actuator/health");
  return data;
};

export const listCenters = async () => {
  const { data } = await api.get<Center[]>("/api/v1/centers");
  return data;
};

export const createCenter = async (payload: { name: string }) => {
  const { data } = await api.post<Center>("/api/v1/centers", payload);
  return data;
};

export const listClients = async (centerId?: string) => {
  const q = centerId ? `?centerId=${centerId}` : "";
  const { data } = await api.get<Client[]>(`/api/v1/clients${q}`);
  return data;
};

export const createClient = async (payload: { name: string; centerId?: string; phone?: string; flagsNote?: string; note?: string }) => {
  const { data } = await api.post<Client>("/api/v1/clients", payload);
  return data;
};

export const updateClient = async (clientId: string, payload: { name?: string; centerId?: string; phone?: string; flagsNote?: string; note?: string }) => {
  const { data } = await api.patch<Client>(`/api/v1/clients/${clientId}`, payload);
  return data;
};

export const getClientProfile = async (clientId: string) => {
  const { data } = await api.get<ClientProfile>(`/api/v1/clients/${clientId}/profile`);
  return data;
};

export const upsertClientProfile = async (
  clientId: string,
  payload: {
    painNote?: string;
    goalNote?: string;
    surgeryHistory?: string;
    beforeClassMemo?: string;
    afterClassMemo?: string;
    nextLessonPlan?: string;
  }
) => {
  const { data } = await api.put<ClientProfile>(`/api/v1/clients/${clientId}/profile`, payload);
  return data;
};

export const listClientHomeworks = async (clientId: string) => {
  const { data } = await api.get<Homework[]>(`/api/v1/clients/${clientId}/homeworks`);
  return data;
};

export const createClientHomework = async (clientId: string, payload: { content: string; remindAt?: string }) => {
  const { data } = await api.post<Homework>(`/api/v1/clients/${clientId}/homeworks`, payload);
  return data;
};

export const listGroupSequences = async (centerId: string, lessonType?: "PERSONAL" | "GROUP") => {
  const q = lessonType ? `&lessonType=${lessonType}` : "";
  const { data } = await api.get<GroupSequence[]>(`/api/v1/group-sequences?centerId=${centerId}${q}`);
  return data;
};

export const createGroupSequence = async (payload: {
  centerId: string;
  lessonType: "PERSONAL" | "GROUP";
  classDate: string;
  equipmentBrand?: string;
  springSetting?: string;
  todaySequence?: string;
  nextSequence?: string;
  beforeMemo?: string;
  afterMemo?: string;
  memberNotes?: string;
}) => {
  const { data } = await api.post<GroupSequence>("/api/v1/group-sequences", payload);
  return data;
};

export const listGroupSequenceTemplates = async (centerId: string, lessonType: "PERSONAL" | "GROUP") => {
  const { data } = await api.get<GroupSequenceTemplate[]>(`/api/v1/group-sequence-templates?centerId=${centerId}&lessonType=${lessonType}`);
  return data;
};

export const createGroupSequenceTemplate = async (payload: {
  centerId: string;
  lessonType: "PERSONAL" | "GROUP";
  title: string;
  equipmentBrand?: string;
  springSetting?: string;
  sequenceBody?: string;
}) => {
  const { data } = await api.post<GroupSequenceTemplate>("/api/v1/group-sequence-templates", payload);
  return data;
};

export const listClientProgressPhotos = async (clientId: string) => {
  const { data } = await api.get<ClientProgressPhoto[]>(`/api/v1/clients/${clientId}/progress-photos`);
  return data;
};

export const uploadClientProgressPhoto = async (
  clientId: string,
  file: File,
  payload: { phase?: "BEFORE" | "AFTER" | "ETC"; note?: string; takenOn?: string }
) => {
  const fd = new FormData();
  fd.append("file", file);
  if (payload.phase) fd.append("phase", payload.phase);
  if (payload.note) fd.append("note", payload.note);
  if (payload.takenOn) fd.append("takenOn", payload.takenOn);
  const { data } = await api.post<ClientProgressPhoto>(`/api/v1/clients/${clientId}/progress-photos`, fd, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const createSession = async (payload: { clientId: string; date: string; type: "PERSONAL" | "GROUP"; memo?: string; startTime?: string }) => {
  const { data } = await api.post<Session>("/api/v1/sessions", payload);
  return data;
};

export const listSessionsByDate = async (date: string) => {
  const { data } = await api.get<Session[]>(`/api/v1/sessions?date=${date}`);
  return data;
};

export const listSessionsWithReportByDate = async (date: string) => {
  const { data } = await api.get<SessionWithReport[]>(`/api/v1/sessions/with-report?date=${date}`);
  return data;
};

export const createReport = async (payload: { sessionId: string; summaryItems?: string; strengthNote?: string; improveNote?: string; nextGoal?: string }) => {
  const { data } = await api.post<Report>("/api/v1/reports", payload);
  return data;
};

export const updateReport = async (
  reportId: string,
  payload: { summaryItems?: string; strengthNote?: string; improveNote?: string; nextGoal?: string; homework?: string; painChange?: string }
) => {
  const { data } = await api.patch<Report>(`/api/v1/reports/${reportId}`, payload);
  return data;
};

export const listReportPhotos = async (reportId: string) => {
  const { data } = await api.get<ReportPhoto[]>(`/api/v1/reports/${reportId}/photos`);
  return data;
};

export const uploadReportPhoto = async (reportId: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<ReportPhoto>(`/api/v1/reports/${reportId}/photos`, fd, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const listClientReports = async (clientId: string) => {
  const { data } = await api.get<Report[]>(`/api/v1/clients/${clientId}/reports?limit=20`);
  return data;
};

export const createShare = async (reportId: string, expireHours = 72) => {
  const { data } = await api.post<ShareResponse>(`/api/v1/reports/${reportId}/share`, { expireHours });
  return data;
};

export const openShare = async (token: string) => {
  const { data } = await api.get<PublicShare>(`/api/v1/share/${token}`);
  return data;
};
