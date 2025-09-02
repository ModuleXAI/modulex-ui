export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
    errors?: Record<string, string[]>;
  }
  
  export interface DashboardStatsResponse {
    success: boolean;
    organization_id: string;
    stats: ModuleXStats;
  }
  
  export class ApiError extends Error {
    public code: string;
    public details?: any;
  
    constructor(message: string, code: string, details?: any) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
      this.details = details;
    }
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }
  
  // Updated to match actual backend response
  export interface ModuleXStats {
    total_members: number;
    total_tool_authenticated: number;
    total_integrations: number;
    active_integrations: number;
    api_calls_today: number;
    system_health: 'healthy' | 'warning' | 'critical';
    // Legacy fields for backward compatibility (optional)
    total_users?: number;
    active_users?: number;
    total_tools?: number;
    active_tools?: number;
    total_requests?: number;
    successful_requests?: number;
    last_updated?: string;
  } 
  
  // Post-register bootstrap status
  export interface BootstrapStatusResponse {
    success: boolean;
    ready: boolean;
    eta?: number; // seconds
    step?: string; // e.g., "create-profile", "link-organization"
    details?: string;
  }
  
  // Organization invite capability response
  export interface CanInviteResponse {
    success: boolean;
    can_invite: boolean;
    max_seats?: number;
    current_members?: number;
  }