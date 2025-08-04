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
    // Use fixed redirect URI from environment variable or generate dynamically
    let redirectUri = process.env.TINK_REDIRECT_URI;
    
    if (!redirectUri) {
      // Fallback to dynamic generation if not set
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const host = req.headers.host;
      redirectUri = `${protocol}://${host}/auth/tink/callback`;
    }
    
    console.log('Using Tink redirect URI:', redirectUri);
    
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
      const { userData, billItems, ...sessionFields } = req.body;
      
      // Extract participant count from userData
      const participantCount = userData?.participantCount || 4;
      
      const sessionData = insertSessionSchema.parse({
        ...sessionFields,
        participantCount
      });
      
      const session = await storage.createSession(sessionData);
      
      // Create bill items if provided
      if (billItems && billItems.length > 0) {
        const itemsWithSession = billItems.map((item: any) => ({
          ...item,
          sessionId: session.id
        }));
        await storage.createBillItems(itemsWithSession);
      }
      
      // Create main booker participant if userData provided
      if (userData?.name) {
        const mainBookerData = {
          sessionId: session.id,
          name: userData.name,
          bankAccount: userData.bankAccount || '',
          isMainBooker: true,
          hasPaid: false,
          paidAmount: '0',
          expectedAmount: '0'
        };
        
        const mainBooker = await storage.createParticipant(mainBookerData);
        
        // Update session with main booker ID
        await storage.updateSession(session.id, { mainBookerId: mainBooker.id });
        
        // Handle main booker's item selection for 'items' mode
        let expectedAmount = 0;
        if (session.splitMode === 'items' && userData.selectedItems && billItems?.length > 0) {
          
          // Get the created bill items from database first
          const createdItems = await storage.getBillItemsBySession(session.id);
          
          // Create item claims for main booker's selections
          for (const selection of userData.selectedItems) {
            const billItem = billItems[selection.index];
            if (billItem && selection.quantity > 0) {
              // Find matching item in database
              const matchingItem = createdItems.find(item => 
                item.name === billItem.name && 
                item.price === billItem.price
              );
              
              if (matchingItem) {
                // Create item claim with the actual selected quantity
                await storage.createItemClaim({
                  participantId: mainBooker.id,
                  billItemId: matchingItem.id,
                  quantity: selection.quantity
                });
                
                expectedAmount += parseFloat(matchingItem.price) * selection.quantity;
              }
            }
          }
          
          // Update main booker's expected amount based on selected items
          await storage.updateParticipant(mainBooker.id, {
            expectedAmount: expectedAmount.toFixed(2)
          });
        }
        
        // Auto-mark main booker as paid since they pay restaurant directly
        const totalAmount = parseFloat(session.totalAmount);
        
        // For items mode, preserve the expectedAmount that was already set based on selected items
        // For equal mode, set the expectedAmount to the equal share based on actual participant count
        const mainBookerExpectedAmount = session.splitMode === 'equal' 
          ? (totalAmount / (participantCount || 1)).toString() 
          : expectedAmount.toFixed(2); // Use the calculated amount from selected items
        
        await storage.updateParticipant(mainBooker.id, {
          hasPaid: true,
          paidAmount: totalAmount.toString(),
          expectedAmount: mainBookerExpectedAmount
        });
        
        // Create payment record for main booker
        await storage.createPayment({
          sessionId: session.id,
          participantId: mainBooker.id,
          amount: totalAmount.toString(),
          status: 'completed'
        });
      }
      
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
      const sessionId = req.params.id;
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const participantData = insertParticipantSchema.parse({
        ...req.body,
        sessionId
      });
      
      const participant = await storage.createParticipant(participantData);
      
      // For equal split mode, recalculate expected amounts for all participants
      if (session.splitMode === 'equal') {
        const allParticipants = await storage.getParticipantsBySession(sessionId);
        const totalAmount = parseFloat(session.totalAmount);
        const participantCount = allParticipants.length;
        const expectedAmountPerPerson = (totalAmount / participantCount).toFixed(2);
        
        // Update expected amount for all participants
        for (const p of allParticipants) {
          await storage.updateParticipant(p.id, {
            expectedAmount: expectedAmountPerPerson
          });
        }
      }
      
      broadcastToSession(sessionId, {
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

  // Process payment (for participants paying to main booker)
  app.post('/api/sessions/:id/pay', async (req, res) => {
    try {
      const { participantId, amount } = req.body;
      const sessionId = req.params.id;
      
      // Get session and main booker info
      const session = await storage.getSession(sessionId);
      const participants = await storage.getParticipantsBySession(sessionId);
      const mainBooker = participants.find(p => p.isMainBooker);
      
      if (!session || !mainBooker) {
        return res.status(404).json({ message: 'Session or main booker not found' });
      }
      
      // Create payment record (participant pays to main booker's account)
      const payment = await storage.createPayment({
        sessionId,
        participantId,
        amount: amount.toString(),
        status: 'completed' // Simulated banking payment always succeeds
      });
      
      // Update participant as paid
      await storage.updateParticipant(participantId, {
        hasPaid: true,
        paidAmount: amount.toString()
      });
      
      // Broadcast real-time update to all session participants
      broadcastToSession(sessionId, {
        type: 'participant-payment-completed',
        participantId,
        participant: await storage.getParticipant(participantId),
        payment
      });
      
      // Check if all participants have paid
      const updatedParticipants = await storage.getParticipantsBySession(sessionId);
      const allPaid = updatedParticipants.every(p => p.hasPaid);
      
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

  // Initiate banking payment flow  
  app.post('/api/sessions/:id/initiate-payment', async (req, res) => {
    try {
      const sessionId = req.params.id;
      
      // Get session data
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const participants = await storage.getParticipantsBySession(sessionId);
      const mainBooker = participants.find(p => p.isMainBooker);
      
      if (!mainBooker) {
        return res.status(400).json({ message: 'Main booker not found' });
      }
      
      // Return payment initialization data
      res.json({
        success: true,
        sessionId,
        amount: session.totalAmount,
        recipient: session.restaurantName,
        description: `${session.restaurantName} - Tafel ${session.tableNumber}`,
        mainBooker: mainBooker.name
      });
      
    } catch (error) {
      console.error('Payment initiation error:', error);
      res.status(500).json({ message: 'Failed to initiate payment' });
    }
  });

  // Complete banking payment (called after successful banking flow)
  app.post('/api/sessions/:id/complete-payment', async (req, res) => {
    try {
      const sessionId = req.params.id;
      
      // Get session and participants
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const participants = await storage.getParticipantsBySession(sessionId);
      const mainBooker = participants.find(p => p.isMainBooker);
      
      if (!mainBooker) {
        return res.status(400).json({ message: 'Main booker not found' });
      }
      
      const totalAmount = parseFloat(session.totalAmount);
      
      // Create payment record for the full amount
      const payment = await storage.createPayment({
        sessionId,
        participantId: mainBooker.id,
        amount: totalAmount.toString(),
        status: 'completed'
      });
      
      // Mark main booker as having paid the full amount
      await storage.updateParticipant(mainBooker.id, {
        hasPaid: true,
        paidAmount: totalAmount.toString()
      });
      
      // Mark all other participants as paid (since main booker covered them)
      for (const participant of participants) {
        if (!participant.isMainBooker) {
          await storage.updateParticipant(participant.id, {
            hasPaid: true,
            paidAmount: participant.expectedAmount || '0'
          });
        }
      }
      
      // Mark session as completed
      await storage.updateSession(sessionId, { isActive: false });
      
      // Broadcast session completion
      broadcastToSession(sessionId, {
        type: 'session-completed'
      });
      
      res.json({ 
        success: true, 
        payment,
        message: 'Payment completed successfully via banking app'
      });
      
    } catch (error) {
      console.error('Payment completion error:', error);
      res.status(500).json({ message: 'Failed to complete payment' });
    }
  });

  // Main booker pays full bill (legacy endpoint - kept for compatibility)
  app.post('/api/sessions/:id/pay-full', async (req, res) => {
    try {
      const sessionId = req.params.id;
      
      // Get session and participants
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const participants = await storage.getParticipantsBySession(sessionId);
      const mainBooker = participants.find(p => p.isMainBooker);
      
      if (!mainBooker) {
        return res.status(400).json({ message: 'Main booker not found' });
      }
      
      const totalAmount = parseFloat(session.totalAmount);
      
      // Create payment record for the full amount
      const payment = await storage.createPayment({
        sessionId,
        participantId: mainBooker.id,
        amount: totalAmount.toString(),
        status: 'completed'
      });
      
      // Mark main booker as having paid the full amount
      await storage.updateParticipant(mainBooker.id, {
        hasPaid: true,
        paidAmount: totalAmount.toString()
      });
      
      // Mark all other participants as paid (since main booker covered them)
      for (const participant of participants) {
        if (!participant.isMainBooker) {
          await storage.updateParticipant(participant.id, {
            hasPaid: true,
            paidAmount: participant.expectedAmount || '0'
          });
        }
      }
      
      // Mark session as completed
      await storage.updateSession(sessionId, { isActive: false });
      
      // Broadcast session completion
      broadcastToSession(sessionId, {
        type: 'session-completed'
      });
      
      res.json({ 
        success: true, 
        payment,
        message: 'Full bill paid successfully'
      });
      
    } catch (error) {
      console.error('Full payment error:', error);
      res.status(400).json({ message: 'Failed to process full payment' });
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
      
      // Use the same redirect URI that was used in the authorization request
      let redirectUri = process.env.TINK_REDIRECT_URI;
      
      if (!redirectUri) {
        // Fallback to dynamic generation if not set
        const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
        const host = req.headers.host;
        redirectUri = `${protocol}://${host}/auth/tink/callback`;
      }
      
      console.log('Using callback redirect URI:', redirectUri);
      
      // Exchange code for access token
      console.log('Exchanging authorization code for access token...');
      const tokenData = await exchangeCodeForToken(code as string, redirectUri);
      
      if (!tokenData.access_token) {
        console.error('Failed to get access token from Tink');
        return res.redirect('/tink-callback?bank_linked=error&error=no_token');
      }
      
      console.log('Access token obtained successfully');
      
      // Get IBAN and account info from Tink
      console.log('Fetching account information...');
      const accountInfo = await getIbanFromTink(tokenData.access_token);
      
      if (!accountInfo) {
        console.error('Could not retrieve account information from Tink API');
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
