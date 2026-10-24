export interface DistractionSettings {
  isEnabled: boolean;
  scheduleMode: "focus_only" | "focus_and_breaks" | "always";
  pausePolicy: "keep_blocking" | "pause_blocking";
}

export interface ActiveSession {
  id: string;
  sessionType: "focus" | "short_break" | "long_break";
  status: "active" | "paused";
  label: string | null;
  remainingSeconds: number;
  plannedDurationSeconds: number;
  expectedEndAt: string;
  startedAt: string;
}

export interface ExtensionUser {
  id: string;
  displayName: string;
  username: string;
}

export interface ExtensionStorage {
  token: string | null;
  apiUrl: string;
  user: ExtensionUser | null;
  distractionSettings: DistractionSettings | null;
  blockedDomains: string[];
  activeSession: ActiveSession | null;
  isBlockingActive: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  lastSyncStatus: "success" | "error" | "offline" | "idle";
  rulesCount: number;
}

export type ExtensionMessage =
  | { type: "PAIR"; code: string; apiUrl?: string }
  | { type: "SYNC" }
  | { type: "DISCONNECT" }
  | { type: "GET_STATUS" };

export interface SyncApiResponse {
  isBlockingActive: boolean;
  distractionSettings: DistractionSettings;
  blockedDomains: string[];
  activeSession: ActiveSession | null;
  user: ExtensionUser;
  serverTime: string;
}
