import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  json, 
  boolean,
  integer,
  decimal,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'starter', 
  'professional', 
  'boardroom', 
  'enterprise'
]);

export const messageSenderEnum = pgEnum('message_sender', [
  'user', 
  'ai', 
  'system'
]);

export const messageStatusEnum = pgEnum('message_status', [
  'pending', 
  'streaming', 
  'completed', 
  'error'
]);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 512 }),
  subscriptionTier: subscriptionTierEnum('subscription_tier').default('starter').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Conversations table
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  config: json('config').$type<{
    model: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }>().notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  sender: messageSenderEnum('sender').notNull(),
  content: text('content').notNull(),
  status: messageStatusEnum('status').default('completed').notNull(),
  model: varchar('model', { length: 100 }),
  metadata: json('metadata').$type<{
    tokensUsed?: number;
    cost?: number;
    regenerated?: boolean;
    edited?: boolean;
    originalContent?: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Message reactions table
export const messageReactions = pgTable('message_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emoji: varchar('emoji', { length: 10 }).notNull(),
  isFavorite: boolean('is_favorite').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User subscriptions table
export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tier: subscriptionTierEnum('tier').notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(), // active, cancelled, expired
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Usage tracking table
export const usageTracking = pgTable('usage_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  model: varchar('model', { length: 100 }).notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  cost: decimal('cost', { precision: 10, scale: 6 }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  metadata: json('metadata').$type<{
    provider?: string;
    requestType?: string;
    responseTime?: number;
  }>(),
});

// User preferences table
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  defaultModel: varchar('default_model', { length: 100 }).default('openai/gpt-3.5-turbo').notNull(),
  defaultTemperature: decimal('default_temperature', { precision: 3, scale: 2 }).default('0.7').notNull(),
  defaultMaxTokens: integer('default_max_tokens').default(500).notNull(),
  defaultSystemPrompt: text('default_system_prompt'),
  theme: varchar('theme', { length: 20 }).default('dark').notNull(), // dark, light, system
  language: varchar('language', { length: 10 }).default('en').notNull(),
  notifications: json('notifications').$type<{
    email?: boolean;
    browser?: boolean;
    usage?: boolean;
    billing?: boolean;
  }>().default({
    email: true,
    browser: true,
    usage: true,
    billing: true,
  }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Shared conversations table (for conversation sharing features)
export const sharedConversations = pgTable('shared_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  shareToken: varchar('share_token', { length: 255 }).notNull().unique(),
  isPublic: boolean('is_public').default(false).notNull(),
  allowedEmails: json('allowed_emails').$type<string[]>(),
  expiresAt: timestamp('expires_at'),
  viewCount: integer('view_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  conversations: many(conversations),
  messageReactions: many(messageReactions),
  subscription: one(userSubscriptions, {
    fields: [users.id],
    references: [userSubscriptions.userId],
  }),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  usageTracking: many(usageTracking),
  sharedConversations: many(sharedConversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
  sharedConversation: one(sharedConversations, {
    fields: [conversations.id],
    references: [sharedConversations.conversationId],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  reactions: many(messageReactions),
  usageTracking: one(usageTracking, {
    fields: [messages.id],
    references: [usageTracking.messageId],
  }),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(messages, {
    fields: [messageReactions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReactions.userId],
    references: [users.id],
  }),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
}));

export const usageTrackingRelations = relations(usageTracking, ({ one }) => ({
  user: one(users, {
    fields: [usageTracking.userId],
    references: [users.id],
  }),
  message: one(messages, {
    fields: [usageTracking.messageId],
    references: [messages.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const sharedConversationsRelations = relations(sharedConversations, ({ one }) => ({
  conversation: one(conversations, {
    fields: [sharedConversations.conversationId],
    references: [conversations.id],
  }),
  owner: one(users, {
    fields: [sharedConversations.ownerId],
    references: [users.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type NewMessageReaction = typeof messageReactions.$inferInsert;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
export type UsageTracking = typeof usageTracking.$inferSelect;
export type NewUsageTracking = typeof usageTracking.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
export type SharedConversation = typeof sharedConversations.$inferSelect;
export type NewSharedConversation = typeof sharedConversations.$inferInsert;