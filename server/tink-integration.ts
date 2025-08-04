// Tink API integration for bank account linking
// Using Tink's PSD2 API for Belgian banks

const TINK_BASE_URL = 'https://api.tink.com';
const TINK_CLIENT_ID = process.env.TINK_CLIENT_ID!;
const TINK_REDIRECT_URI = process.env.TINK_REDIRECT_URI!;

interface TinkTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface TinkAccount {
  id: string;
  name: string;
  type: string;
  accountNumber: {
    iban?: string;
    bban?: string;
  };
  holderName: string;
  balance: {
    amount: number;
    currencyCode: string;
  };
}

interface AccountInfo {
  iban: string;
  accountHolder: string;
}

export async function exchangeCodeForToken(authorizationCode: string, redirectUri: string): Promise<TinkTokenResponse> {
  try {
    // Check if required environment variables are available
    if (!TINK_CLIENT_ID) {
      throw new Error('TINK_CLIENT_ID environment variable not set');
    }

    console.log('Attempting token exchange with Tink API...');
    console.log('Using Client ID:', TINK_CLIENT_ID);
    console.log('Using Redirect URI:', redirectUri);
    console.log('Authorization Code:', authorizationCode.substring(0, 10) + '...');
    
    // For public client OAuth2 flow (no client_secret required)
    const response = await fetch(`${TINK_BASE_URL}/api/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: redirectUri,
        client_id: TINK_CLIENT_ID
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', response.status, response.statusText, errorText);
      
      // If it's a client error (4xx), it might be a configuration issue
      if (response.status >= 400 && response.status < 500) {
        console.error('Client error - check Tink configuration and credentials');
      }
      
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const tokenData = await response.json();
    console.log('Token exchange successful');
    return tokenData;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    
    // Only use mock data in development or when explicitly enabled
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_BANK === 'true';
    
    if (isDevelopment) {
      console.log('Using mock token data for development/demo');
      return {
        access_token: 'demo_access_token_' + Math.random().toString(36).substring(7),
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'accounts:read'
      };
    } else {
      // In production, throw the error so it can be handled properly
      throw error;
    }
  }
}

export async function getIbanFromTink(accessToken: string): Promise<AccountInfo | null> {
  try {
    console.log('Fetching account information from Tink API...');
    
    const response = await fetch(`${TINK_BASE_URL}/data/v2/accounts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch accounts:', response.status, response.statusText, errorText);
      throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const accounts: TinkAccount[] = data.accounts || [];
    
    console.log(`Found ${accounts.length} accounts from Tink`);

    // Find the first account with an IBAN
    const primaryAccount = accounts.find(account => 
      account.accountNumber?.iban && 
      account.type === 'CHECKING'
    );

    if (!primaryAccount || !primaryAccount.accountNumber.iban) {
      console.error('No checking account with IBAN found in Tink response');
      throw new Error('No checking account with IBAN found');
    }

    console.log('Successfully retrieved account information from Tink');
    
    return {
      iban: primaryAccount.accountNumber.iban,
      accountHolder: primaryAccount.holderName || 'Account Holder'
    };

  } catch (error) {
    console.error('Error fetching IBAN from Tink:', error);
    
    // Only use mock data in development or when explicitly enabled
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_BANK === 'true';
    
    if (isDevelopment) {
      console.log('Using mock account data for development/demo');
      
      const mockIbans = [
        'BE68539007547034',
        'BE02230041544780', 
        'BE86796456123890',
        'BE43096123456769'
      ];
      
      const mockNames = [
        'Jan Peeters',
        'Marie Dubois', 
        'Pieter Janssens',
        'Sophie Van Den Berg'
      ];
      
      const randomIndex = Math.floor(Math.random() * mockIbans.length);
      
      return {
        iban: mockIbans[randomIndex],
        accountHolder: mockNames[randomIndex]
      };
    } else {
      // In production, return null to indicate failure
      console.error('Account fetching failed in production environment');
      return null;
    }
  }
}

export async function validateBankConnection(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${TINK_BASE_URL}/data/v2/accounts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error validating bank connection:', error);
    return false;
  }
}