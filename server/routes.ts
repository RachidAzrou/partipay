import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertSessionSchema, insertParticipantSchema, insertItemClaimSchema } from "@shared/schema";
import { z } from "zod";
import { getIbanFromTink, exchangeCodeForToken } from "./tink-integration.js";

interface WebSocketClient extends WebSocket {
  sessionId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const sessionClients = new Map<string, Set<WebSocketClient>>();

  wss.on('connection', (ws: WebSocketClient) => {
    console.log('WebSocket connection established');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'join-session' && data.sessionId) {
          ws.sessionId = data.sessionId;
          
          if (!sessionClients.has(data.sessionId)) {
            sessionClients.set(data.sessionId, new Set());
          }
          sessionClients.get(data.sessionId)!.add(ws);
          
          console.log(`Client joined session ${data.sessionId}`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (ws.sessionId) {
        const clients = sessionClients.get(ws.sessionId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            sessionClients.delete(ws.sessionId);
          }
        }
      }
    });
  });

  // Broadcast to session participants
  function broadcastToSession(sessionId: string, message: any) {
    const clients = sessionClients.get(sessionId);
    if (clients) {
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  // Get mock bill data from QR scan
  app.post('/api/scan-qr', async (req, res) => {
    try {
      const { tableNumber, restaurantName } = req.body;
      
      if (!tableNumber || !restaurantName) {
        return res.status(400).json({ message: 'Table number and restaurant name required' });
      }

      const billData = await storage.getMockBillData(tableNumber, restaurantName);
      
      if (!billData) {
        return res.status(404).json({ message: 'Bill not found for this table' });
      }

      res.json(billData);
    } catch (error) {
      console.error('QR scan error:', error);
      res.status(500).json({ message: 'Failed to retrieve bill data' });
    }
  });

  // Create new session
  app.post('/api/sessions', async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      
      res.json(session);
    } catch (error) {
      console.error('Create session error:', error);
      res.status(400).json({ message: 'Invalid session data' });
    }
  });

  // Get session details
  app.get('/api/sessions/:id', async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const participants = await storage.getParticipantsBySession(session.id);
      const billItems = await storage.getBillItemsBySession(session.id);
      const itemClaims = await storage.getItemClaimsBySession(session.id);
      const payments = await storage.getPaymentsBySession(session.id);

      res.json({
        session,
        participants,
        billItems,
        itemClaims,
        payments
      });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({ message: 'Failed to retrieve session' });
    }
  });

  // Create bill items for session
  app.post('/api/sessions/:id/items', async (req, res) => {
    try {
      const { items } = req.body;
      const sessionId = req.params.id;
      
      const itemsWithSession = items.map((item: any) => ({
        ...item,
        sessionId
      }));
      
      const createdItems = await storage.createBillItems(itemsWithSession);
      
      broadcastToSession(sessionId, {
        type: 'items-updated',
        items: createdItems
      });
      
      res.json(createdItems);
    } catch (error) {
      console.error('Create bill items error:', error);
      res.status(400).json({ message: 'Failed to create bill items' });
    }
  });

  // Join session as participant
  app.post('/api/sessions/:id/join', async (req, res) => {
    try {
      const participantData = insertParticipantSchema.parse({
        ...req.body,
        sessionId: req.params.id
      });
      
      const participant = await storage.createParticipant(participantData);
      
      // Update session main booker if this is the first participant
      const allParticipants = await storage.getParticipantsBySession(req.params.id);
      if (allParticipants.length === 1 && participant.isMainBooker) {
        await storage.updateSession(req.params.id, { mainBookerId: participant.id });
      }
      
      broadcastToSession(req.params.id, {
        type: 'participant-joined',
        participant
      });
      
      res.json(participant);
    } catch (error) {
      console.error('Join session error:', error);
      res.status(400).json({ message: 'Failed to join session' });
    }
  });

  // Claim items (Pay Your Part mode)
  app.post('/api/sessions/:id/claim-items', async (req, res) => {
    try {
      const { participantId, itemClaims } = req.body;
      const sessionId = req.params.id;
      
      // Delete existing claims for this participant
      const existingClaims = await storage.getItemClaimsBySession(sessionId);
      for (const claim of existingClaims) {
        if (claim.participantId === participantId) {
          await storage.deleteItemClaim(claim.participantId, claim.billItemId);
        }
      }
      
      // Create new claims
      const createdClaims = [];
      for (const claim of itemClaims) {
        const newClaim = await storage.createItemClaim({
          participantId,
          billItemId: claim.billItemId,
          quantity: claim.quantity
        });
        createdClaims.push(newClaim);
      }
      
      // Calculate expected amount for participant
      const billItems = await storage.getBillItemsBySession(sessionId);
      let expectedAmount = 0;
      
      for (const claim of createdClaims) {
        const item = billItems.find(i => i.id === claim.billItemId);
        if (item) {
          expectedAmount += parseFloat(item.price) * claim.quantity;
        }
      }
      
      await storage.updateParticipant(participantId, {
        expectedAmount: expectedAmount.toFixed(2)
      });
      
      broadcastToSession(sessionId, {
        type: 'items-claimed',
        participantId,
        claims: createdClaims,
        expectedAmount
      });
      
      res.json({ claims: createdClaims, expectedAmount });
    } catch (error) {
      console.error('Claim items error:', error);
      res.status(400).json({ message: 'Failed to claim items' });
    }
  });

  // Process payment
  app.post('/api/sessions/:id/pay', async (req, res) => {
    try {
      const { participantId, amount } = req.body;
      const sessionId = req.params.id;
      
      const payment = await storage.createPayment({
        sessionId,
        participantId,
        amount: amount.toString(),
        status: 'completed' // Mock payment always succeeds
      });
      
      await storage.updateParticipant(participantId, {
        hasPaid: true,
        paidAmount: amount.toString()
      });
      
      broadcastToSession(sessionId, {
        type: 'payment-completed',
        participantId,
        payment
      });
      
      // Check if all participants have paid
      const participants = await storage.getParticipantsBySession(sessionId);
      const allPaid = participants.every(p => p.hasPaid);
      
      if (allPaid) {
        await storage.updateSession(sessionId, { isActive: false });
        broadcastToSession(sessionId, {
          type: 'session-completed'
        });
      }
      
      res.json(payment);
    } catch (error) {
      console.error('Payment error:', error);
      res.status(400).json({ message: 'Payment failed' });
    }
  });

  // Tink OAuth2 callback
  app.get('/auth/tink/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).send('Missing authorization code or state');
      }
      
      // Exchange code for access token
      const tokenData = await exchangeCodeForToken(code as string);
      
      if (!tokenData.access_token) {
        return res.status(400).send('Failed to get access token');
      }
      
      // Get IBAN and account info from Tink
      const accountInfo = await getIbanFromTink(tokenData.access_token);
      
      if (!accountInfo) {
        return res.status(400).send('Could not retrieve account information');
      }
      
      // Store in session storage for the frontend to pick up
      // In production, you'd want a more secure approach
      const sessionData = {
        iban: accountInfo.iban,
        accountHolder: accountInfo.accountHolder,
        accessToken: tokenData.access_token
      };
      
      // Redirect back to frontend with success message
      const redirectUrl = `${req.headers.origin || 'http://localhost:5000'}?bank_linked=success&data=${encodeURIComponent(JSON.stringify(sessionData))}`;
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('Tink callback error:', error);
      res.status(500).send('Authentication failed');
    }
  });
  
  // Link bank account to session
  app.post('/api/sessions/:id/link-bank', async (req, res) => {
    try {
      const { iban, accountHolder, accessToken } = req.body;
      const sessionId = req.params.id;
      
      if (!iban || !accountHolder) {
        return res.status(400).json({ message: 'IBAN and account holder name are required' });
      }
      
      await storage.updateSession(sessionId, {
        linkedIban: iban,
        accountHolderName: accountHolder,
        tinkAccessToken: accessToken // In production: encrypt this
      });
      
      broadcastToSession(sessionId, {
        type: 'bank-linked',
        iban,
        accountHolder
      });
      
      res.json({ success: true, iban, accountHolder });
      
    } catch (error) {
      console.error('Link bank error:', error);
      res.status(500).json({ message: 'Failed to link bank account' });
    }
  });

  return httpServer;
}
