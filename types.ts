
export interface AnalysisResult {
  analysis: string; // This will now contain the JSON string
  generatedContent: string;
  raw: string;
}

export interface AppState {
  sampleText: string;
  topic: string;
  isLoading: boolean;
  error: string | null;
  result: AnalysisResult | null;
}

export enum ViewMode {
  INPUT = 'INPUT',
  RESULT = 'RESULT'
}

export type KeyStatus = 'active' | 'quota_exceeded' | 'error';

export interface ApiKeyData {
  key: string;
  label?: string; // Tên gợi nhớ (Key 1, Key dự phòng...)
  status: KeyStatus;
  lastUsed?: number;
}
