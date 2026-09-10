import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const progress = sqliteTable('progress', {
  profile: text('profile').notNull(),
  kind: text('kind').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
}, t => [primaryKey({columns:[t.profile,t.kind,t.key]})]);
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  profile: text('profile').notNull(),
  expires: text('expires').notNull(),
});
