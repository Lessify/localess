import { relations } from 'drizzle-orm';

import {
  assets,
  contentLinkSnapshots,
  contents,
  contentSnapshots,
  firebaseImports,
  locales,
  passwordResetTokens,
  schemas,
  sessions,
  spaceEnvironments,
  spaceLocales,
  spaces,
  taskLogs,
  tasks,
  tokens,
  translations,
  translationSnapshots,
  userCredentials,
  userIdentities,
  users,
  webhookLogs,
  webhooks,
} from './schema.js';

// The relations of the foreign keys in schema.ts, for the relational queries (`db.query.spaces.findFirst({ with: … })`).
// They change no table: migrations come from schema.ts alone. A relation here is a property of its table's `<X>Select`
// (shared/entities), present when a query asks for it. Names are camelCase; a table related to itself names the
// relation (`relationName`) so its parent and children pair up.

export const usersRelations = relations(users, ({ one, many }) => ({
  credential: one(userCredentials),
  identities: many(userIdentities),
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
  tasks: many(tasks),
}));

export const userCredentialsRelations = relations(userCredentials, ({ one }) => ({
  user: one(users, { fields: [userCredentials.userId], references: [users.id] }),
}));

export const userIdentitiesRelations = relations(userIdentities, ({ one }) => ({
  user: one(users, { fields: [userIdentities.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const localesRelations = relations(locales, ({ many }) => ({
  spaceLocales: many(spaceLocales),
}));

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  defaultLocale: one(locales, { fields: [spaces.defaultLocaleId], references: [locales.id] }),
  spaceLocales: many(spaceLocales),
  environments: many(spaceEnvironments),
  contents: many(contents),
  contentLinkSnapshots: many(contentLinkSnapshots),
  assets: many(assets),
  schemas: many(schemas),
  translations: many(translations),
  translationSnapshots: many(translationSnapshots),
  tasks: many(tasks),
  tokens: many(tokens),
  webhooks: many(webhooks),
  firebaseImport: one(firebaseImports),
}));

export const spaceEnvironmentsRelations = relations(spaceEnvironments, ({ one }) => ({
  space: one(spaces, { fields: [spaceEnvironments.spaceId], references: [spaces.id] }),
}));

export const spaceLocalesRelations = relations(spaceLocales, ({ one }) => ({
  space: one(spaces, { fields: [spaceLocales.spaceId], references: [spaces.id] }),
  locale: one(locales, { fields: [spaceLocales.localeId], references: [locales.id] }),
}));

export const contentsRelations = relations(contents, ({ one, many }) => ({
  space: one(spaces, { fields: [contents.spaceId], references: [spaces.id] }),
  parent: one(contents, {
    fields: [contents.spaceId, contents.parentId],
    references: [contents.spaceId, contents.id],
    relationName: 'contentParent',
  }),
  children: many(contents, { relationName: 'contentParent' }),
  snapshots: many(contentSnapshots),
}));

export const contentSnapshotsRelations = relations(contentSnapshots, ({ one }) => ({
  content: one(contents, {
    fields: [contentSnapshots.spaceId, contentSnapshots.contentId],
    references: [contents.spaceId, contents.id],
  }),
}));

export const contentLinkSnapshotsRelations = relations(contentLinkSnapshots, ({ one }) => ({
  space: one(spaces, { fields: [contentLinkSnapshots.spaceId], references: [spaces.id] }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  space: one(spaces, { fields: [assets.spaceId], references: [spaces.id] }),
  parent: one(assets, {
    fields: [assets.spaceId, assets.parentId],
    references: [assets.spaceId, assets.id],
    relationName: 'assetParent',
  }),
  children: many(assets, { relationName: 'assetParent' }),
}));

export const schemasRelations = relations(schemas, ({ one }) => ({
  space: one(spaces, { fields: [schemas.spaceId], references: [spaces.id] }),
}));

export const translationsRelations = relations(translations, ({ one }) => ({
  space: one(spaces, { fields: [translations.spaceId], references: [spaces.id] }),
}));

export const translationSnapshotsRelations = relations(translationSnapshots, ({ one }) => ({
  space: one(spaces, { fields: [translationSnapshots.spaceId], references: [spaces.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  space: one(spaces, { fields: [tasks.spaceId], references: [spaces.id] }),
  logs: many(taskLogs),
  createdBy: one(users, { fields: [tasks.createdById], references: [users.id] }),
}));

export const taskLogsRelations = relations(taskLogs, ({ one }) => ({
  task: one(tasks, { fields: [taskLogs.taskId], references: [tasks.id] }),
}));

export const tokensRelations = relations(tokens, ({ one }) => ({
  space: one(spaces, { fields: [tokens.spaceId], references: [spaces.id] }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  space: one(spaces, { fields: [webhooks.spaceId], references: [spaces.id] }),
  logs: many(webhookLogs),
}));

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  webhook: one(webhooks, { fields: [webhookLogs.webhookId], references: [webhooks.id] }),
}));

export const firebaseImportsRelations = relations(firebaseImports, ({ one }) => ({
  space: one(spaces, { fields: [firebaseImports.spaceId], references: [spaces.id] }),
}));
