import { api } from "./client";
import type { Client, LoginResponse, PublicShare, Report, Session, SessionWithReport, ShareResponse } from "../types/api";

export const login = async (username: string, password: string) => {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/login", { username, password });
  return data;
};

export const health = async () => {
  const { data } = await api.get("/actuator/health");
  return data;
};

export const listClients = async () => {
  const { data } = await api.get<Client[]>("/api/v1/clients");
  return data;
};

export const createClient = async (payload: { name: string; phone?: string; flagsNote?: string; note?: string }) => {
  const { data } = await api.post<Client>("/api/v1/clients", payload);
  return data;
};

export const createSession = async (payload: { clientId: string; date: string; type: "PERSONAL" | "GROUP"; memo?: string }) => {
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
