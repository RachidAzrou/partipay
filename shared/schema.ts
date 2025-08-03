import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantName: text("restaurant_name").notNull(),
  tableNumber: text("table_number").notNull(),
  splitMode: text("split_mode").notNull(), // 'equal' or 'items'
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  mainBookerId: varchar("main_booker_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bankAccount: text("bank_account"),
  isMainBooker: boolean("is_main_booker").default(false),
  hasPaid: boolean("has_paid").default(false),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const billItems = pgTable("bill_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  availableQuantity: integer("available_quantity").notNull(),
});

export const itemClaims = pgTable("item_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  billItemId: varchar("bill_item_id").notNull().references(() => billItems.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  participantId: varchar("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const sessionsRelations = relations(sessions, ({ many, one }) => ({
  participants: many(participants),
  billItems: many(billItems),
  payments: many(payments),
  mainBooker: one(participants, {
    fields: [sessions.mainBookerId],
    references: [participants.id],
  }),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  session: one(sessions, {
    fields: [participants.sessionId],
    references: [sessions.id],
  }),
  itemClaims: many(itemClaims),
  payments: many(payments),
}));

export const billItemsRelations = relations(billItems, ({ one, many }) => ({
  session: one(sessions, {
    fields: [billItems.sessionId],
    references: [sessions.id],
  }),
  claims: many(itemClaims),
}));

export const itemClaimsRelations = relations(itemClaims, ({ one }) => ({
  participant: one(participants, {
    fields: [itemClaims.participantId],
    references: [participants.id],
  }),
  billItem: one(billItems, {
    fields: [itemClaims.billItemId],
    references: [billItems.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  session: one(sessions, {
    fields: [payments.sessionId],
    references: [sessions.id],
  }),
  participant: one(participants, {
    fields: [payments.participantId],
    references: [participants.id],
  }),
}));

// Insert schemas
export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  createdAt: true,
});

export const insertBillItemSchema = createInsertSchema(billItems).omit({
  id: true,
});

export const insertItemClaimSchema = createInsertSchema(itemClaims).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Types
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type BillItem = typeof billItems.$inferSelect;
export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type ItemClaim = typeof itemClaims.$inferSelect;
export type InsertItemClaim = z.infer<typeof insertItemClaimSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
