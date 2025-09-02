export interface Organization {
  id: string;
  slug: string;
  name: string;
  domain: string;
  role: 'admin' | 'member' | 'owner';
  joined_at: string;
  is_default: boolean;
}

export interface UserOrganizationsResponse {
  success: boolean;
  user_id: string;
  organizations: Organization[];
  total: number;
}

export interface OrganizationState {
  organizations: Organization[];
  selectedOrganizationId: string | null;
  selectedOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
} 