export interface Tool {
  id: number;
  name: string;
  display_name: string;
  description: string;
  author: string;
  version: string;
  logo?: string;
  app_url?: string;
  categories?: ToolCategory[];
  actions?: ToolAction[];
  enabled_actions?: ToolAction[];
  disabled_actions?: ToolAction[];
  environment_variables?: EnvironmentVariable[];
  setup_environment_variables?: Record<string, string> | EnvironmentVariable[];
  created_at: string;
  updated_at: string;
  installed_at?: string;
  // NEW: Auth schema support
  auth_schemas?: AuthSchema[];
  // NEW: OAuth2 system availability (tool level)
  oauth2_env_available?: boolean;
  // NEW: For installed tools
  auth_type?: string;
  env_source?: 'user_provided' | 'env_file' | 'mixed';
}

// NEW: Auth schema interface
export interface AuthSchema {
  auth_type: string;
  setup_environment_variables: EnvironmentVariable[];
  system_has_oauth2_variables?: boolean; // Only for OAuth2 schemas
}

export interface ToolCategory {
  id: string;
  name: string;
}

export interface ToolAction {
  name: string;
  description: string;
}

export interface EnvironmentVariable {
  name: string;
  about_url?: string;
  description: string;
  sample_format: string;
  value?: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'url' | 'secret';
}

export interface ToolsResponse {
  success: boolean;
  tools: Tool[];
  total: number;
}

export interface ToolSearchFilters {
  category?: string;
  installed?: boolean;
  enabled?: boolean;
  search?: string;
}

// NEW: Installation request interface
export interface ToolInstallationRequest {
  tool_name: string;
  auth_type: string;
  environment_variables?: Record<string, string>;
} 