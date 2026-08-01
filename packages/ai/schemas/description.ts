// Frontend-safe. Plain TypeScript types only.

export type DescriptionStyle = 'luxury' | 'traditional' | 'modern' | 'casual' | 'fine_dining';

export interface GenerateDescriptionInput {
  itemId: string;
  style: DescriptionStyle;
  locale: string;
}

export interface GenerateDescriptionResult {
  description: string;
}
