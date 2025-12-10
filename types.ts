export interface AnalysisResult {
  analysis: string;
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
