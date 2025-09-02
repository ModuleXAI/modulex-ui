// Log types based on backend logging.py models

export interface LogsResponse {
  success: boolean;
  logs: LogEntry[];
  pagination: {
    total_count: number;
    limit: number;
    offset: number;
    has_next: boolean;
    has_previous: boolean;
  };
  filters: {
    start_date: string | null;
    end_date: string | null;
    log_type: string | null;
    level: string | null;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  log_type: LogType;
  level: LogLevel;
  user_id: string | null;
  message: string;
  success: boolean | null;
  tool_name: string | null;
  category: string | null;
  details: string | null;
}

export type LogType = 
  | 'request' 
  | 'security' 
  | 'business' 
  | 'error' 
  | 'system' 
  | 'audit';

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogFilters {
  log_type?: LogType;
  level?: LogLevel;
  limit: number;
  offset: number;
  search?: string;
  start_date?: string;
  end_date?: string;
} 