export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
};

export type Client = {
  id: string;
  name: string;
  phone?: string;
  flagsNote?: string;
  note?: string;
  createdAt: string;
};

export type Session = {
  id: string;
  clientId: string;
  date: string;
  type: "PERSONAL" | "GROUP";
  memo?: string;
  createdAt: string;
};

export type SessionWithReport = Session & {
  hasReport: boolean;
};

export type Report = {
  id: string;
  clientId: string;
  sessionId: string;
  summaryItems?: string;
  strengthNote?: string;
  improveNote?: string;
  nextGoal?: string;
  homework?: string;
  painChange?: string;
  createdAt: string;
  updatedAt: string;
};

export type ShareResponse = {
  token: string;
  shareUrl: string;
  expiresAt: string;
};

export type PublicShare = {
  clientName: string;
  sessionDate: string;
  summaryItems?: string;
  strengthNote?: string;
  improveNote?: string;
  nextGoal?: string;
  homework?: string;
  painChange?: string;
  expiresAt: string;
  viewCount: number;
};
