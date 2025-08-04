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

  // Get client configuration
  app.get('/api/config', (req, res) => {
    // Generate the correct redirect URI based on the current request
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/auth/tink/callback`;
    
    res.json({
      tinkClientId: process.env.TINK_CLIENT_ID?.trim(),
      tinkRedirectUri: redirectUri
    });
  });

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
      
      // Automatically mark main booker as paid since they pay the restaurant directly
      if (participant.isMainBooker) {
        const session = await storage.getSession(req.params.id);
        const totalAmount = parseFloat(session?.totalAmount || '0');
        
        // Update participant to mark as paid with their expected amount
        await storage.updateParticipant(participant.id, {
          hasPaid: true,
          paidAmount: totalAmount.toString(), // Main booker pays the full amount to restaurant
          expectedAmount: totalAmount.toString()
        });
        
        // Create payment record for main booker
        await storage.createPayment({
          sessionId: req.params.id,
          participantId: participant.id,
          amount: totalAmount.toString(),
          status: 'completed'
        });
        
        // Get updated participant data
        const updatedParticipant = await storage.getParticipant(participant.id);
        
        broadcastToSession(req.params.id, {
          type: 'participant-joined',
          participant: updatedParticipant
        });
        
        res.json(updatedParticipant);
      } else {
        broadcastToSession(req.params.id, {
          type: 'participant-joined',
          participant
        });
        
        res.json(participant);
      }
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
      const { code, state, error } = req.query;
      
      // Handle OAuth errors
      if (error) {
        console.error('OAuth error:', error);
        const errorUrl = `/tink-callback?bank_linked=error&error=${encodeURIComponent(error as string)}`;
        return res.redirect(errorUrl);
      }
      
      if (!code || !state) {
        console.error('Missing authorization code or state');
        return res.redirect('/tink-callback?bank_linked=error&error=missing_params');
      }
      
      console.log('Tink callback received with code and state');
      
      // Generate the same redirect URI that was used in the authorization request
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/auth/tink/callback`;
      
      // Exchange code for access token
      const tokenData = await exchangeCodeForToken(code as string, redirectUri);
      
      if (!tokenData.access_token) {
        console.error('Failed to get access token');
        return res.redirect('/tink-callback?bank_linked=error&error=no_token');
      }
      
      console.log('Access token obtained successfully');
      
      // Get IBAN and account info from Tink
      const accountInfo = await getIbanFromTink(tokenData.access_token);
      
      if (!accountInfo) {
        console.error('Could not retrieve account information');
        return res.redirect('/tink-callback?bank_linked=error&error=no_account_info');
      }
      
      console.log('Account info retrieved:', { iban: accountInfo.iban.substring(0, 4) + '****', accountHolder: accountInfo.accountHolder });
      
      // Prepare bank data for frontend
      const bankData = {
        iban: accountInfo.iban,
        accountHolder: accountInfo.accountHolder,
        accessToken: tokenData.access_token
      };
      
      // Redirect to callback page with success data
      const redirectUrl = `/tink-callback?bank_linked=success&data=${encodeURIComponent(JSON.stringify(bankData))}`;
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('Tink callback error:', error);
      res.redirect('/tink-callback?bank_linked=error&error=server_error');
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
