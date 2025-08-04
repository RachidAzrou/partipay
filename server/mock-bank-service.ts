// Mock bank service for production use without external dependencies
// Simulates realistic Dutch banking integration

interface MockBankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  balance: number;
  bankCode: string;
  logo: string;
}

interface MockBank {
  id: string;
  name: string;
  logo: string;
  color: string;
  accounts: MockBankAccount[];
}

// Realistic Dutch banks with their BIC codes
const DUTCH_BANKS: Record<string, MockBank> = {
  'ing': {
    id: 'ing',
    name: 'ING Bank',
    logo: '🦁',
    color: '#FF6200',
    accounts: [
      {
        id: 'ing_1',
        bankName: 'ING Bank',
        accountHolder: 'Jan Peeters',
        iban: 'NL91INGB0002445588',
        balance: 2847.32,
        bankCode: 'INGBNL2A',
        logo: '🦁'
      },
      {
        id: 'ing_2', 
        bankName: 'ING Bank',
        accountHolder: 'Jan Peeters',
        iban: 'NL56INGB0005432109',
        balance: 156.78,
        bankCode: 'INGBNL2A',
        logo: '🦁'
      }
    ]
  },
  'rabobank': {
    id: 'rabobank',
    name: 'Rabobank',
    logo: '🏦',
    color: '#002F6C',
    accounts: [
      {
        id: 'rabo_1',
        bankName: 'Rabobank',
        accountHolder: 'Jan Peeters',
        iban: 'NL20RABO0300065264',
        balance: 1523.45,
        bankCode: 'RABONL2U',
        logo: '🏦'
      }
    ]
  },
  'abnamro': {
    id: 'abnamro',
    name: 'ABN AMRO',
    logo: '🏧',
    color: '#00A79D',
    accounts: [
      {
        id: 'abn_1',
        bankName: 'ABN AMRO',
        accountHolder: 'Jan Peeters',
        iban: 'NL12ABNA0614576832',
        balance: 3241.87,
        bankCode: 'ABNANL2A',
        logo: '🏧'
      }
    ]
  },
  'sns': {
    id: 'sns',
    name: 'SNS Bank',
    logo: '💛',
    color: '#FFCD00',
    accounts: [
      {
        id: 'sns_1',
        bankName: 'SNS Bank',
        accountHolder: 'Jan Peeters',
        iban: 'NL86SNSB0942234486',
        balance: 892.14,
        bankCode: 'SNSBNL2A',
        logo: '💛'
      }
    ]
  }
};

export interface MockAuthRequest {
  bankId: string;
  accountId: string;
  state: string;
}

export interface MockAuthResponse {
  success: boolean;
  data?: {
    iban: string;
    accountHolder: string;
    bankName: string;
    logo: string;
  };
  error?: string;
}

export class MockBankService {
  // Generate a secure state parameter
  static generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Get list of available banks
  static getBankList(): Array<{id: string; name: string; logo: string; color: string}> {
    return Object.values(DUTCH_BANKS).map(bank => ({
      id: bank.id,
      name: bank.name,
      logo: bank.logo,
      color: bank.color
    }));
  }

  // Get accounts for a specific bank
  static getBankAccounts(bankId: string): MockBankAccount[] {
    const bank = DUTCH_BANKS[bankId];
    return bank ? bank.accounts : [];
  }

  // Simulate bank authentication
  static async authenticateWithBank(request: MockAuthRequest): Promise<MockAuthResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const bank = DUTCH_BANKS[request.bankId];
    if (!bank) {
      return {
        success: false,
        error: 'unknown_bank'
      };
    }

    const account = bank.accounts.find(acc => acc.id === request.accountId);
    if (!account) {
      return {
        success: false,
        error: 'account_not_found'
      };
    }

    // Simulate random authentication failures (5% chance)
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: 'authentication_failed'
      };
    }

    return {
      success: true,
      data: {
        iban: account.iban,
        accountHolder: account.accountHolder,
        bankName: account.bankName,
        logo: account.logo
      }
    };
  }

  // Validate IBAN format (basic check)
  static validateIban(iban: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Check if it's a valid Dutch IBAN format
    const dutchIbanPattern = /^NL\d{2}[A-Z]{4}\d{10}$/;
    return dutchIbanPattern.test(cleanIban);
  }

  // Format IBAN for display
  static formatIban(iban: string): string {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    return cleanIban.replace(/(.{4})/g, '$1 ').trim();
  }
}