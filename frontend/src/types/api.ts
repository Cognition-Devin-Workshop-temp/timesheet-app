export interface User {
  email: string;
  createdAt: string;
  displayName?: string | null;
  role?: 'manager' | 'member';
  teamId?: number | null;
}

export interface Client {
  id: number;
  name: string;
  description: string | null;
  department: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkEntry {
  id: number;
  client_id: number;
  hours: number;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
}

export interface WorkEntryWithClient extends WorkEntry {
  client_name: string;
}

export interface ClientReport {
  client: Client;
  workEntries: WorkEntry[];
  totalHours: number;
  entryCount: number;
}

export interface CreateClientRequest {
  name: string;
  description?: string;
  department?: string;
  email?: string;
}

export interface UpdateClientRequest {
  name?: string;
  description?: string;
  department?: string;
  email?: string;
}

export interface CreateWorkEntryRequest {
  clientId: number;
  hours: number;
  description?: string;
  date: string;
}

export interface UpdateWorkEntryRequest {
  clientId?: number;
  hours?: number;
  description?: string;
  date?: string;
}

export interface LoginRequest {
  email: string;
}

export interface LoginResponse {
  message: string;
  user: User;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export type WorkloadStatus = 'overloaded' | 'healthy' | 'underloaded';

export interface TeamMemberWorkload {
  email: string;
  displayName: string | null;
  totalHours: number;
  capacity: number;
  utilizationPct: number | null;
  entryCount: number;
  status: WorkloadStatus;
}

export interface TeamWorkloadSummary {
  memberCount: number;
  teamTotalHours: number;
  teamAvgHours: number;
  overloadedCount: number;
}

export interface TeamWorkloadResponse {
  week: { startDate: string; endDate: string };
  team: { id: number; name: string };
  summary: TeamWorkloadSummary;
  members: TeamMemberWorkload[];
}

export interface ClientBreakdownEntry {
  clientId: number;
  clientName: string;
  department: string | null;
  hours: number;
  entries: number;
}

export interface MemberBreakdownResponse {
  member: {
    email: string;
    displayName: string | null;
    totalHours: number;
    capacity: number;
  };
  week: { startDate: string; endDate: string };
  breakdown: ClientBreakdownEntry[];
}

export interface TeamMember {
  email: string;
  displayName: string | null;
  role: 'manager' | 'member';
  weeklyCapacity: number;
  createdAt: string;
}
