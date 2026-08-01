// Frontend-safe. Plain TypeScript types only.

export interface OptimizerDimensionResult {
  score: number;
  note: string;
}

export interface OptimizerBreakdown {
  balance: OptimizerDimensionResult;
  priceDistribution: OptimizerDimensionResult;
  descriptionQuality: OptimizerDimensionResult;
  imageCoverage: OptimizerDimensionResult;
  languageCoverage: OptimizerDimensionResult;
  categoryQuality: OptimizerDimensionResult;
  menuLength: OptimizerDimensionResult;
  duplicates: OptimizerDimensionResult;
}

export interface OptimizerOutput {
  score: number;
  breakdown: OptimizerBreakdown;
  topRecommendations: string[];
}

export interface MenuScoreHistoryEntry {
  id: string;
  score: number;
  breakdown: OptimizerBreakdown;
  created_at: string;
}
