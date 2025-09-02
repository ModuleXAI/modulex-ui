export interface User {
  id: string;
  email: string | null;
  username: string | null;
  avatar?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lastActiveAt?: string | null;
  toolCount?: number;
  activeToolCount?: number;
  totalLogins?: number;
  role?: 'admin' | 'member' | 'owner';
  // Invitation-related fields (present when this row represents an invitation)
  is_invitation?: boolean;
  invitation_id?: string | null;
  invited_user_id?: string | null;
  invitation_status?: string | null;
  invited_at?: string | null;
  invitation_expires_at?: string | null;
}

export interface UserTool {
  id: string;
  name: string;
  category: string;
  is_authenticated: boolean;
  last_used?: string;
  created_at: string;
}

export interface UserActivity {
  type: 'login' | 'tool_auth' | 'tool_execution' | 'logout' | 'other';
  description: string;
  timestamp: string;
  metadata?: string;
}

export interface UserSession {
  id: string;
  is_active: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  expires_at?: string;
}

export interface UserDetail extends User {
  tools?: UserTool[];
  activities?: UserActivity[];
  sessions?: UserSession[];
  sessionCount?: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersToday: number;
  activePercentage: number;
  newUsersChange: number;
}

export interface UsersResponse {
  users: User[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface UserFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'name' | 'email' | 'created' | 'activity';
  page?: number;
  limit?: number;
} 