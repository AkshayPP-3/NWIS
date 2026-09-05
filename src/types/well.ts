// NWIS - Nearby Wells Intelligence System: Core Domain Types

export interface Well {
  id: number;
  wellId: string;
  name: string;
  latitude: number;
  longitude: number;
  totalDepth: number | null;
  formation: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId?: number | null;
}

export interface WellEvent {
  id: number;
  eventType: string;
  startDepth: number | null;
  endDepth: number | null;
  severity: "High" | "Medium" | "Low" | string | null;
  description: string | null;
  mitigation: string | null;
  wellId: number;
  createdAt: string;
}

export interface DrillingParameter {
  id: number;
  depth: number | null;
  rop: number | null;
  wob: number | null;
  rpm: number | null;
  torque: number | null;
  mudWeight: number | null;
  pressure: number | null;
  wellId: number;
  recordedAt: string;
}

export interface WellWithDetails extends Well {
  events: WellEvent[];
  parameters: DrillingParameter[];
}

export interface NearbyWellInfo extends Well {
  distanceKm: number;
  distanceMeters: number;
  bearingDeg: number;
  sameFormation: boolean;
  depthDifference: number | null;
  eventsCount: number;
  highSeverityEvents: number;
  recentEvent?: WellEvent | null;
}

export interface TargetLocation {
  latitude: number;
  longitude: number;
  label?: string;
}

export type RiskCategory =
  | "Historical Pattern"
  | "Calculated Indicator"
  | "AI Insight"
  | "Potential Risk";

export interface RiskIndicator {
  id: string;
  title: string;
  category: RiskCategory;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  formation: string;
  depthInterval?: { start: number; end: number };
  description: string;
  mitigationRecommendation: string;
  evidence: {
    sourceWellId?: string;
    parameterName?: string;
    recordedValue?: string | number;
    depthM?: number;
    notes: string;
  }[];
}

export interface AIAssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  evidence?: {
    title: string;
    details: string;
    category?: RiskCategory;
    wellIds?: string[];
  }[];
  matchedWells?: string[];
  actionLink?: {
    type: "view_well" | "compare" | "filter_formation" | "show_nearby";
    targetId: string;
    label: string;
  };
}

export interface FieldAnalytics {
  totalWells: number;
  statusCounts: {
    completed: number;
    drilling: number;
    abandoned: number;
    other: number;
  };
  formationStats: {
    formation: string;
    count: number;
    avgDepth: number;
    minDepth: number;
    maxDepth: number;
    eventCount: number;
  }[];
  eventSeverityCounts: {
    high: number;
    medium: number;
    low: number;
  };
  eventTypeCounts: Record<string, number>;
  depthDistribution: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
  riskSummary: {
    criticalRisks: number;
    activeAlerts: number;
  };
}

export interface FilterState {
  searchQuery: string;
  status: string; // 'ALL' | 'Completed' | 'Drilling' | 'Abandoned'
  formation: string; // 'ALL' | string
  minDepth: number;
  maxDepth: number;
  maxDistanceKm: number | null;
}

