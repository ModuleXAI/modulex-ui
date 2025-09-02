export interface AnalyticsDateRange {
    startDate: Date;
    endDate: Date;
    period: '24h' | '7d' | '30d' | '90d' | 'custom';
  }
  
  export interface AnalyticsMetric {
    value: number;
    change: number;
    changeType: 'increase' | 'decrease' | 'stable';
    period: string;
  }
  
  export interface UserAnalytics {
    totalUsers: number;
    newUsers: AnalyticsMetric;
    activeUsers: AnalyticsMetric;
    avgSessionTime: AnalyticsMetric;
    userGrowth: Array<{
      date: string;
      newUsers: number;
      totalUsers: number;
    }>;
    userActivity: Array<{
      hour: string;
      activeUsers: number;
    }>;
    usersByRegion: Array<{
      region: string;
      users: number;
      percentage: number;
    }>;
    topUsers: Array<{
      id: string;
      name: string;
      email: string;
      toolsUsed: number;
      lastActive: string;
    }>;
  }
  
  export interface ToolAnalytics {
    totalInstallations: AnalyticsMetric;
    toolExecutions: AnalyticsMetric;
    successRate: AnalyticsMetric;
    avgExecutionTime: AnalyticsMetric;
    toolAdoption: Array<{
      month: string;
      installations: number;
      uninstallations: number;
    }>;
    toolUsageByCategory: Array<{
      category: string;
      usage: number;
      percentage: number;
      color: string;
    }>;
    topTools: Array<{
      id: string;
      name: string;
      users: number;
      usage: number;
      successRate: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    toolPerformance: Array<{
      time: string;
      avgExecutionTime: number;
      successRate: number;
    }>;
  }
  
  export interface PerformanceAnalytics {
    avgResponseTime: AnalyticsMetric;
    uptime: AnalyticsMetric;
    requestVolumeMetric: AnalyticsMetric;
    errorRate: AnalyticsMetric;
    apiResponseTimes: Array<{
      time: string;
      p50: number;
      p95: number;
      p99: number;
    }>;
    endpointPerformance: Array<{
      endpoint: string;
      avgTime: number;
      calls: number;
      errors: number;
    }>;
    systemMetrics: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    requestVolumeData: Array<{
      hour: string;
      requests: number;
      errors: number;
    }>;
  }
  
  export interface SecurityAnalytics {
    securityScore: number;
    failedLogins: AnalyticsMetric;
    suspiciousActivities: AnalyticsMetric;
    activeSessions: number;
    securityEvents: Array<{
      time: string;
      loginAttempts: number;
      failedLogins: number;
      suspiciousActivity: number;
    }>;
    authMethodsUsage: Array<{
      method: string;
      value: number;
      color: string;
    }>;
    securityScoreRadar: Array<{
      subject: string;
      score: number;
      fullMark: number;
    }>;
    suspiciousIPs: Array<{
      ip: string;
      attempts: number;
      location: string;
      status: 'blocked' | 'monitoring' | 'allowed';
    }>;
    recentSecurityEvents: Array<{
      id: number;
      type: string;
      message: string;
      severity: 'high' | 'medium' | 'low' | 'info';
      time: string;
    }>;
  }
  
  export interface AnalyticsOverview {
    totalUsers: number;
    totalTools: number;
    activeTools: number;
    systemHealth: 'optimal' | 'good' | 'warning' | 'critical';
    userGrowth: Array<{
      date: string;
      users: number;
      growth: number;
    }>;
    toolUsage: Array<{
      date: string;
      executions: number;
    }>;
    systemPerformance: Array<{
      time: string;
      cpu: number;
      memory: number;
      responseTime: number;
    }>;
    recentAlerts: Array<{
      id: string;
      type: 'security' | 'performance' | 'system' | 'user';
      message: string;
      severity: 'high' | 'medium' | 'low';
      timestamp: string;
    }>;
  } 