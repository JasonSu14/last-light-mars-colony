import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const sessions = sqliteTable('mission_sessions', {
 id:text('id').primaryKey(), tokenHash:text('token_hash').notNull(), mode:text('mode').notNull(),
 status:text('status').notNull(), createdAt:integer('created_at').notNull(), expiresAt:integer('expires_at').notNull(),
}, t=>[index('mission_expiry').on(t.expiresAt)]);
export const commands = sqliteTable('mission_commands', {
 id:integer('id').primaryKey({autoIncrement:true}), sessionId:text('session_id').notNull().references(()=>sessions.id,{onDelete:'cascade'}),
 requestId:text('request_id').notNull(), payload:text('payload').notNull(),
},t=>[uniqueIndex('mission_request').on(t.sessionId,t.requestId),index('mission_queue').on(t.sessionId,t.id)]);
