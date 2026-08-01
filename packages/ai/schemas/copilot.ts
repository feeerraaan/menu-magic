// Frontend-safe. Plain TypeScript types only.

export type CopilotRole = 'system' | 'user' | 'assistant' | 'tool';

export interface CopilotMessage {
  id: string;
  role: CopilotRole;
  content: string | null;
  created_at: string;
}

export interface CopilotConversation {
  id: string;
  restaurant_id: string;
  title: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CopilotActionStatus {
  status: 'previewed' | 'confirmed' | 'cancelled' | 'executed' | 'failed' | 'partially_failed';
}

export interface MutationChange {
  entity_type: 'item' | 'category' | 'menu';
  entity_id: string;
  entity_name: string;
  field: string;
  before: unknown;
  after: unknown;
}

export interface MutationPreview {
  preview_id: string;
  tool_name: string;
  summary: string;
  destructive: boolean;
  affected_count: number;
  changes: MutationChange[];
  expires_at: string;
}

// --- Edge Function request/response contracts ---

export interface CopilotStartConversationInput {
  restaurantId: string;
  title?: string;
}

export interface CopilotStartConversationResponse {
  conversationId: string;
}

export interface CopilotMessageInput {
  restaurantId: string;
  conversationId: string;
  message: string;
}

export type CopilotMessageTurn =
  | {
      kind: 'text';
      reply: string;
    }
  | {
      kind: 'preview';
      reply: string;
      preview: MutationPreview;
    }
  | {
      kind: 'error';
      error: string;
    };

export interface CopilotConfirmPreviewInput {
  restaurantId: string;
  previewId: string;
}

export interface CopilotConfirmPreviewResponse {
  actionId: string;
  summary: string;
  appliedChanges: number;
}

export interface CopilotCancelPreviewInput {
  restaurantId: string;
  previewId: string;
}

export interface CopilotCancelPreviewResponse {
  actionId: string;
  status: 'cancelled';
}

export interface CopilotHistoryInput {
  restaurantId: string;
  conversationId: string;
}

export interface CopilotHistoryResponse {
  messages: CopilotMessage[];
}

export interface CopilotListConversationsInput {
  restaurantId: string;
}

export interface CopilotListConversationsResponse {
  conversations: CopilotConversation[];
}
