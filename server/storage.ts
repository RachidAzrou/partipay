import { 
  sessions, 
  participants, 
  billItems, 
  itemClaims, 
  payments,
  type Session, 
  type InsertSession,
  type Participant,
  type InsertParticipant,
  type BillItem,
  type InsertBillItem,
  type ItemClaim,
  type InsertItemClaim,
  type Payment,
  type InsertPayment
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined>;
  
  // Participants
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipant(id: string): Promise<Participant | undefined>;
  getParticipantsBySession(sessionId: string): Promise<Participant[]>;
  updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined>;
  
  // Bill Items
  createBillItems(items: InsertBillItem[]): Promise<BillItem[]>;
  getBillItemsBySession(sessionId: string): Promise<BillItem[]>;
  updateBillItem(id: string, updates: Partial<BillItem>): Promise<BillItem | undefined>;
  
  // Item Claims
  createItemClaim(claim: InsertItemClaim): Promise<ItemClaim>;
  getItemClaimsBySession(sessionId: string): Promise<ItemClaim[]>;
  deleteItemClaim(participantId: string, billItemId: string): Promise<void>;
  
  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsBySession(sessionId: string): Promise<Payment[]>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined>;
  
  // Mock POS system
  getMockBillData(tableNumber: string, restaurantName: string): Promise<{ items: Omit<InsertBillItem, 'sessionId'>[], totalAmount: string } | null>;
}

export class DatabaseStorage implements IStorage {
  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db
      .insert(sessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const [updated] = await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();
    return updated || undefined;
  }

  async createParticipant(participant: InsertParticipant): Promise<Participant> {
    const [newParticipant] = await db
      .insert(participants)
      .values(participant)
      .returning();
    return newParticipant;
  }

  async getParticipant(id: string): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants).where(eq(participants.id, id));
    return participant || undefined;
  }

  async getParticipantsBySession(sessionId: string): Promise<Participant[]> {
    return await db.select().from(participants).where(eq(participants.sessionId, sessionId));
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    const [updated] = await db
      .update(participants)
      .set(updates)
      .where(eq(participants.id, id))
      .returning();
    return updated || undefined;
  }

  async createBillItems(items: InsertBillItem[]): Promise<BillItem[]> {
    return await db
      .insert(billItems)
      .values(items)
      .returning();
  }

  async getBillItemsBySession(sessionId: string): Promise<BillItem[]> {
    return await db.select().from(billItems).where(eq(billItems.sessionId, sessionId));
  }

  async updateBillItem(id: string, updates: Partial<BillItem>): Promise<BillItem | undefined> {
    const [updated] = await db
      .update(billItems)
      .set(updates)
      .where(eq(billItems.id, id))
      .returning();
    return updated || undefined;
  }

  async createItemClaim(claim: InsertItemClaim): Promise<ItemClaim> {
    const [newClaim] = await db
      .insert(itemClaims)
      .values(claim)
      .returning();
    return newClaim;
  }

  async getItemClaimsBySession(sessionId: string): Promise<ItemClaim[]> {
    return await db
      .select({
        id: itemClaims.id,
        participantId: itemClaims.participantId,
        billItemId: itemClaims.billItemId,
        quantity: itemClaims.quantity,
        createdAt: itemClaims.createdAt,
      })
      .from(itemClaims)
      .innerJoin(participants, eq(itemClaims.participantId, participants.id))
      .where(eq(participants.sessionId, sessionId));
  }

  async deleteItemClaim(participantId: string, billItemId: string): Promise<void> {
    await db
      .delete(itemClaims)
      .where(
        and(
          eq(itemClaims.participantId, participantId),
          eq(itemClaims.billItemId, billItemId)
        )
      );
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getPaymentsBySession(sessionId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.sessionId, sessionId));
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined> {
    const [updated] = await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    return updated || undefined;
  }

  async getMockBillData(tableNumber: string, restaurantName: string): Promise<{ items: Omit<InsertBillItem, 'sessionId'>[], totalAmount: string } | null> {
    // Mock POS system data - in real implementation this would call an external API
    const mockBills: Record<string, { items: Omit<InsertBillItem, 'sessionId'>[], totalAmount: string }> = {
      "De Blauwe Kater-12": {
        items: [
          { name: "Gentse Waterzooi", price: "18.50", quantity: 1, availableQuantity: 1 },
          { name: "Vlaamse Stoofpot", price: "22.00", quantity: 1, availableQuantity: 1 },
          { name: "Frieten met Mayo", price: "6.50", quantity: 2, availableQuantity: 2 },
          { name: "Duvel (33cl)", price: "4.20", quantity: 2, availableQuantity: 2 },
          { name: "Jupiler (25cl)", price: "3.50", quantity: 1, availableQuantity: 1 },
          { name: "Belgische Wafels", price: "8.00", quantity: 1, availableQuantity: 1 },
        ],
        totalAmount: "73.40"
      }
    };

    const key = `${restaurantName}-${tableNumber}`;
    return mockBills[key] || null;
  }
}

export const storage = new DatabaseStorage();
