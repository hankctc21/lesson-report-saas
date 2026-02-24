export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
};

export type Client = {
  id: string;
  centerId?: string;
  name: string;
  phone?: string;
  flagsNote?: string;
  note?: string;
  preferredLessonType?: "PERSONAL" | "GROUP";
  memberStatus?: "CURRENT" | "PAUSED" | "FORMER";
  createdAt: string;
};

export type Center = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
};

export type ClientProfile = {
  clientId: string;
  painNote?: string;
  goalNote?: string;
  surgeryHistory?: string;
  beforeClassMemo?: string;
  afterClassMemo?: string;
  nextLessonPlan?: string;
  updatedAt: string;
};

export type Homework = {
  id: string;
  content: string;
  remindAt?: string;
  notifiedAt?: string;
  completed: boolean;
  createdAt: string;
};

export type ClientTrackingLog = {
  id: string;
  painNote?: string;
  goalNote?: string;
  surgeryHistory?: string;
  beforeClassMemo?: string;
  afterClassMemo?: string;
  nextLessonPlan?: string;
  homeworkGiven?: string;
  homeworkReminderAt?: string;
  createdAt: string;
};

export type GroupSequence = {
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

export type GroupSequenceTemplate = {
  id: string;
  centerId: string;
  lessonType: "PERSONAL" | "GROUP";
  title: string;
  equipmentBrand?: string;
  springSetting?: string;
  sequenceBody?: string;
  createdAt: string;
};

export type ClientProgressPhoto = {
  id: string;
  clientId: string;
  phase: "BEFORE" | "AFTER" | "ETC";
  note?: string;
  takenOn?: string;
  fileName: string;
  imageUrl: string;
  createdAt: string;
};

export type Session = {
  id: string;
  clientId: string;
  date: string;
  type: "PERSONAL" | "GROUP";
  memo?: string;
  startTime?: string;
  createdAt: string;
};

export type SessionWithReport = Session & {
  hasReport: boolean;
};

export type Report = {
  id: string;
  clientId: string;
  sessionId: string;
  sessionDate: string;
  sessionType: "PERSONAL" | "GROUP";
  sessionStartTime?: string;
  summaryItems?: string;
  strengthNote?: string;
  improveNote?: string;
  nextGoal?: string;
  homework?: string;
  painChange?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportPhoto = {
  id: string;
  reportId: string;
  fileName: string;
  createdAt: string;
  imageUrl: string;
};

export type ShareResponse = {
  token: string;
  shareUrl: string;
  expiresAt: string;
};

export type PublicShare = {
  clientName: string;
  sessionDate: string;
  sessionStartTime?: string;
  summaryItems?: string;
  strengthNote?: string;
  improveNote?: string;
  nextGoal?: string;
  homework?: string;
  painChange?: string;
  photos: { id: string; imageUrl: string; createdAt: string }[];
  progressPhotos: { id: string; phase: string; note?: string; takenOn?: string; imageUrl: string; createdAt: string }[];
  expiresAt: string;
  viewCount: number;
};
