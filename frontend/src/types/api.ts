export interface User {
  email: string;
  createdAt: string;
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

export type MemberStatus = 'overloaded' | 'at-risk' | 'on-track' | 'underutilized' | 'unknown';
export type TeamRole = 'manager' | 'member';

export interface Team {
  id: number;
  name: string;
  managerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamListItem extends Team {
  myRole: TeamRole;
  memberCount: number;
}

export interface TeamMember {
  email: string;
  displayName: string;
  weeklyCapacityHours: number;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamMemberWorkload {
  email: string;
  displayName: string;
  role: TeamRole;
  totalHours: number;
  entryCount: number;
  capacityHours: number;
  utilizationPct: number | null;
  status: MemberStatus;
}

export interface TeamWorkloadSummary {
  totalTeamHours: number;
  totalTeamCapacity: number;
  teamUtilizationPct: number;
  memberCount: number;
  overloadedCount: number;
  atRiskCount: number;
  onTrackCount: number;
  underutilizedCount: number;
}

export interface TeamWorkloadResponse {
  team: { id: number; name: string };
  period: { startDate: string; endDate: string };
  summary: TeamWorkloadSummary;
  members: TeamMemberWorkload[];
}

export interface ClientBreakdownItem {
  clientId: number;
  clientName: string;
  hours: number;
  entryCount: number;
}

export interface MemberBreakdown {
  email: string;
  displayName: string;
  clients: ClientBreakdownItem[];
}

export interface TeamWorkloadBreakdownResponse {
  team: { id: number; name: string };
  period: { startDate: string; endDate: string };
  breakdown: MemberBreakdown[];
}

export interface CreateTeamRequest {
  name: string;
}

export interface AddTeamMemberRequest {
  email: string;
  displayName: string;
  weeklyCapacityHours?: number;
}

export interface UpdateTeamMemberRequest {
  displayName?: string;
  weeklyCapacityHours?: number;
}
