export type UserRole = 'admin' | 'manager' | 'field_staff' | 'auditor';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ar' | 'pt' | 'hy' | 'hyw';

export type AssetLifecycleStage = 
  | 'acquisition' 
  | 'operation' 
  | 'maintenance' 
  | 'overhaul' 
  | 'decommissioning' 
  | 'disposal';

export type AssetCriticality = 'A_MISSION_CRITICAL' | 'B_ESSENTIAL' | 'C_NON_CRITICAL';

export type AssetStatus = 
  | 'in_service' 
  | 'in_transit' 
  | 'maintenance' 
  | 'audited' 
  | 'quarantine' 
  | 'decommissioned';

export type ConditionGrade = 1 | 2 | 3 | 4 | 5; // ISO 55001: 1=Very Good, 5=Very Poor

export type DepreciationMethod = 'straight_line' | 'declining_balance';

export interface LocationTelemetry {
  name: string;
  facility: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  accuracyMeters?: number;
  lastPing: string;
}

export interface MovementRecord {
  id: string;
  timestamp: string;
  locationName: string;
  lat: number;
  lng: number;
  actor: string;
  notes?: string;
  statusAtPing: AssetStatus;
}

export interface RiskAssessment {
  likelihood: number; // 1 to 5
  consequence: number; // 1 to 5
  rpn: number; // Likelihood * Consequence (1-25)
  mitigationStrategy: string;
}

export interface SensitiveFinancialData {
  purchasePrice: number;
  currentBookValue: number;
  salvageValue: number;
  annualDepreciation: number;
  purchaseDate: string;
  depreciationMethod: DepreciationMethod;
  usefulLifeYears: number;
  currency: string;
  vendorName: string;
  contractNumber: string;
  isEncryptedInStorage: boolean;
  encryptionAlgorithm: 'AES-256-GCM';
}

export interface AssetCustodian {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  email: string;
  consentRecorded: boolean;
  consentDate: string;
  isAnonymized?: boolean;
  // US & Multi-Jurisdiction Privacy Compliance
  ccpaOptedOut?: boolean;
  ccpaNoticeAcknowledged?: boolean;
  jurisdiction?: 'EU_GDPR' | 'US_CCPA' | 'US_FEDERAL' | 'GLOBAL';
}

export interface UsComplianceMetadata {
  ccpaCompliant: boolean;
  hipaaSubject: boolean;
  hipaaSafeguardsVerified?: boolean;
  nistSanitizationStatus?: 'NOT_REQUIRED' | 'PENDING' | 'CLEAR' | 'PURGE' | 'DESTROY';
  nistCertificateNumber?: string;
  sox404CapitalAssetVerified?: boolean;
}

export type AssetCategory = 
  | 'industrial_machinery' 
  | 'it_computing' 
  | 'fleet_vehicle' 
  | 'medical_lab' 
  | 'facility_tooling' 
  | string;

export interface CategoryDefinition {
  id: string;
  name: string;
  description?: string;
  color?: string;
  iconName?: string;
  isCustom?: boolean;
}

export interface AiAssetClassification {
  category: AssetCategory;
  maintenanceCategory: string;
  maintenanceStrategy: string;
  recommendedFrequency: string;
  iso55001ComplianceGroup: string;
  iso55001Clause: string;
  suggestedCriticality: AssetCriticality;
  suggestedConditionGrade: ConditionGrade;
  riskMitigationStrategy: string;
  tags: string[];
  keySensorsToMonitor?: string[];
  confidenceScore: number;
  rationale: string;
  source?: 'gemini' | 'rules_engine';
}

export type AssetRelationshipType = 
  | 'subassembly' 
  | 'component' 
  | 'sensor_node' 
  | 'power_module' 
  | 'attachment'
  | 'facility_system';

export interface ChildAssetSummary {
  id: string;
  assetTag: string;
  name: string;
  relationshipType: AssetRelationshipType;
  status: AssetStatus;
  healthIndex: number;
  conditionGrade: ConditionGrade;
  criticality: AssetCriticality;
}

export interface Asset {
  id: string;
  assetTag: string; // e.g. "AST-2026-0042"
  barcode: string;
  name: string;
  category: AssetCategory;
  manufacturer: string;
  model: string;
  serialNumber: string; // Sensitive, encrypted in vault
  status: AssetStatus;
  lifecycleStage: AssetLifecycleStage;
  conditionGrade: ConditionGrade;
  healthIndex: number; // 0 to 100%
  criticality: AssetCriticality;
  location: LocationTelemetry;
  custodian: AssetCustodian;
  financials: SensitiveFinancialData;
  riskAssessment: RiskAssessment;
  lastMaintenanceDate: string;
  nextMaintenanceDue: string;
  lastAuditDate: string;
  imageUrl: string;
  movementHistory: MovementRecord[];
  notes?: string;
  description?: string;
  isoComplianceGroup?: string;
  maintenanceCategory?: string;
  maintenanceStrategy?: string;
  tags?: string[];
  aiClassification?: AiAssetClassification;
  syncStatus: 'synced' | 'pending' | 'offline_cached';
  lastUpdated: string;
  usCompliance?: UsComplianceMetadata;
  // Parent-Child Asset Relationships
  parentAssetId?: string;
  parentAssetName?: string;
  parentAssetTag?: string;
  relationshipType?: AssetRelationshipType;
  childAssetIds?: string[];
}

export interface RolePermissions {
  canCreateAsset: boolean;
  canEditAsset: boolean;
  canDeleteAsset: boolean;
  canUnlockFinancialVault: boolean;
  canApproveWorkOrders: boolean;
  canUpdateFieldStatus: boolean;
  canManageGdprData: boolean;
  canManagePermissions: boolean;
  canExportAuditLogs: boolean;
  canLinkAssetHierarchy: boolean;
}

export type PermissionsMatrix = Record<UserRole, RolePermissions>;

export interface PermissionSaveResponse {
  success: boolean;
  message: string;
  savedAt: string;
  updatedBy: string;
  policyHash: string;
  permissions: PermissionsMatrix;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  createdAt: string;
  lastLogin?: string;
}

export type ComplianceStandard = 
  | 'ISO_55001' 
  | 'GDPR_ART_30' 
  | 'CCPA_CPRA' 
  | 'HIPAA_SECURITY' 
  | 'NIST_SP_800' 
  | 'SOX_404' 
  | 'SYSTEM';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'STATUS_CHANGE' 
  | 'LOCATION_PING' 
  | 'MAINTENANCE_LOG' 
  | 'GDPR_ACCESS' 
  | 'GDPR_EXPORT' 
  | 'GDPR_ERASURE' 
  | 'CCPA_ACCESS' 
  | 'CCPA_DELETE' 
  | 'CCPA_OPT_OUT' 
  | 'HIPAA_AUDIT' 
  | 'NIST_SANITIZE' 
  | 'SOX_RECONCILIATION' 
  | 'DECOMMISSION';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction | string;
  assetId?: string;
  assetTag?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  details: string;
  ipHash: string;
  complianceStandard: ComplianceStandard;
}

export interface UrgentAlert {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  assetId?: string;
  assetTag?: string;
  category: 'maintenance_overdue' | 'unauthorized_movement' | 'low_health' | 'audit_due' | 'inventory_anomaly';
  read: boolean;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  language: LanguageCode;
  dpoOfficer: boolean;
  token: string;
  department?: string;
}

export interface OfflineMutation {
  id: string;
  timestamp: string;
  assetId: string;
  type: 'status_update' | 'condition_update' | 'location_update' | 'maintenance_log' | 'create_asset';
  payload: any;
  synced: boolean;
}

export interface FailureRecord {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  timestamp: string;
  failureMode: string;
  component: string;
  severity: 'catastrophic' | 'critical' | 'moderate' | 'minor';
  operatingHoursAtFailure: number;
  downtimeHours: number;
  repairCost: number;
  rootCause: string;
  correctiveAction: string;
  iso55001Clause: string;
  telemetryAnomalyBeforeFailure?: {
    vibrationRms: number; // mm/s
    bearingTempCelsius: number;
    harmonicCurrentPercent: number;
  };
}

export interface PredictiveServiceSuggestion {
  assetId: string;
  assetTag: string;
  assetName: string;
  criticality: AssetCriticality;
  currentConditionGrade: ConditionGrade;
  currentHealthIndex: number;
  currentOperatingHours: number;
  mtbfHours: number; // Mean Time Between Failures
  mttfHours: number; // Mean Time To Failure
  failureProbabilityNext30Days: number; // 0 to 100%
  suggestedServiceDate: string; // ISO string
  confidenceScore: number; // percentage (e.g. 94)
  targetComponent: string;
  predictedFailureMode: string;
  recommendedAction: string;
  iso55001Alignment: string;
  urgency: 'overdue' | 'due_soon' | 'scheduled' | 'healthy';
  estimatedSavings: number; // Cost avoided
  degradationRatePerMonth: number;
  historicalFailuresCount: number;
}

export interface PredictiveDashboardMetrics {
  fleetReliabilityIndex: number;
  criticalAssetsAtRisk: number;
  predictedServices30Days: number;
  avgMtbfHours: number;
  estimatedDowntimeCostAvoided: number;
  totalHistoricalFailures: number;
}

export interface PredictiveDashboardData {
  metrics: PredictiveDashboardMetrics;
  suggestions: PredictiveServiceSuggestion[];
  historicalFailures: FailureRecord[];
  degradationCurves: {
    month: string;
    actualReliability: number;
    unmaintainedCurve: number;
    isoPreventiveTarget: number;
  }[];
}

