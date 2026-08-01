// Frontend-safe. Plain TypeScript types only.

export interface InsightsRecommendation {
  id: string;
  restaurant_id: string;
  category: string;
  target_type: 'item' | 'category' | 'menu' | 'restaurant' | null;
  target_id: string | null;
  title: string;
  detail: string | null;
  status: 'open' | 'dismissed' | 'actioned';
  created_at: string;
}

export interface InsightsNarrative {
  narrative: string;
  generatedAt: string;
}

export interface InsightsRunInput {
  restaurantId: string;
}

export interface InsightsRunResponse {
  jobId: string;
  narrative: string;
  generatedAt: string;
}
