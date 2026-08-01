// Frontend-safe. Plain TypeScript types only.

export interface CustomerAssistantSendInput {
  slug: string;
  sessionToken: string;
  message: string;
}

export interface CustomerAssistantMessage {
  item_id: string;
  name: string;
  price: number | null;
  explanation: string;
  is_vegan?: boolean;
  is_vegetarian?: boolean;
  is_spicy?: boolean;
  is_gluten_free?: boolean;
  allergens?: string[];
}

export interface CustomerAssistantSendResponse {
  reply: string;
  recommendations: CustomerAssistantMessage[];
  rateLimited: boolean;
  rateLimitMessage?: string;
}
