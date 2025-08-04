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

// Realistic Belgian banks with their BIC codes
const BELGIAN_BANKS: Record<string, MockBank> = {
  'kbc': {
    id: 'kbc',
    name: 'KBC Bank',
    logo: '🔵',
    color: '#1E3A8A',
    accounts: [
      {
        id: 'kbc_1',
        bankName: 'KBC Bank',
        accountHolder: 'Jan Peeters',
        iban: 'BE68539007547034',
        balance: 2847.32,
        bankCode: 'KREDBEBB',
        logo: '🔵'
      },
      {
        id: 'kbc_2', 
        bankName: 'KBC Bank',
        accountHolder: 'Jan Peeters',
        iban: 'BE42539007621845',
        balance: 156.78,
        bankCode: 'KREDBEBB',
        logo: '🔵'
      }
    ]
  },
  'belfius': {
    id: 'belfius',
    name: 'Belfius Bank',
    logo: '🟢',
    color: '#16A085',
    accounts: [
      {
        id: 'belfius_1',
        bankName: 'Belfius Bank',
        accountHolder: 'Jan Peeters',
        iban: 'BE75068901234567',
        balance: 1523.45,
        bankCode: 'GKCCBEBB',
        logo: '🟢'
      }
    ]
  },
  'bnpparibas': {
    id: 'bnpparibas',
    name: 'BNP Paribas Fortis',
    logo: '🏛️',
    color: '#00A651',
    accounts: [
      {
        id: 'bnp_1',
        bankName: 'BNP Paribas Fortis',
        accountHolder: 'Jan Peeters',
        iban: 'BE92001012345678',
        balance: 3241.87,
        bankCode: 'GEBABEBB',
        logo: '🏛️'
      }
    ]
  },
  'ing': {
    id: 'ing',
    name: 'ING België',
    logo: '🦁',
    color: '#FF6200',
    accounts: [
      {
        id: 'ing_1',
        bankName: 'ING België',
        accountHolder: 'Jan Peeters',
        iban: 'BE54310123456789',
        balance: 892.14,
        bankCode: 'BBRUBEBB',
        logo: '🦁'
      }
    ]
  },
  'argenta': {
    id: 'argenta',
    name: 'Argenta Bank',
    logo: '🟠',
    color: '#E67E22',
    accounts: [
      {
        id: 'argenta_1',
        bankName: 'Argenta Bank',
        accountHolder: 'Jan Peeters',
        iban: 'BE95979012345678',
        balance: 1456.89,
        bankCode: 'ARSPBE22',
        logo: '🟠'
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
    return Object.values(BELGIAN_BANKS).map(bank => ({
      id: bank.id,
      name: bank.name,
      logo: bank.logo,
      color: bank.color
    }));
  }

  // Get accounts for a specific bank
  static getBankAccounts(bankId: string): MockBankAccount[] {
    const bank = BELGIAN_BANKS[bankId];
    return bank ? bank.accounts : [];
  }

  // Simulate bank authentication
  static async authenticateWithBank(request: MockAuthRequest): Promise<MockAuthResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const bank = BELGIAN_BANKS[request.bankId];
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
    
    // Check if it's a valid Belgian IBAN format
    const belgianIbanPattern = /^BE\d{2}\d{12}$/;
    return belgianIbanPattern.test(cleanIban);
  }

  // Format IBAN for display
  static formatIban(iban: string): string {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    return cleanIban.replace(/(.{4})/g, '$1 ').trim();
  }
}