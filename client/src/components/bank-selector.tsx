import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  balance: number;
  logo: string;
}

interface Bank {
  id: string;
  name: string;
  logo: string;
  color: string;
}

interface BankSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountSelected: (accountData: { iban: string; accountHolder: string; bankName: string; logo: string }) => void;
}

export default function BankSelector({ isOpen, onClose, onAccountSelected }: BankSelectorProps) {
  const [step, setStep] = useState<'banks' | 'accounts' | 'authenticating'>('banks');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchBanks();
    }
  }, [isOpen]);

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mock-banks');
      if (!response.ok) throw new Error('Failed to fetch banks');
      const banksData = await response.json();
      setBanks(banksData);
    } catch (error) {
      console.error('Error fetching banks:', error);
      toast({
        title: "Fout",
        description: "Kon banken niet laden. Probeer opnieuw.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBankSelect = async (bankId: string) => {
    try {
      setLoading(true);
      setSelectedBank(bankId);
      
      const response = await fetch(`/api/mock-banks/${bankId}/accounts`);
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const accountsData = await response.json();
      setAccounts(accountsData);
      setStep('accounts');
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Fout",
        description: "Kon rekeningen niet laden. Probeer opnieuw.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = async () => {
    if (!selectedAccount || !selectedBank) return;

    try {
      setStep('authenticating');
      setLoading(true);

      const state = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);

      const response = await fetch('/api/mock-banks/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankId: selectedBank,
          accountId: selectedAccount,
          state
        })
      });

      if (!response.ok) throw new Error('Authentication failed');
      
      const result = await response.json();
      
      if (result.success && result.data) {
        onAccountSelected(result.data);
        handleClose();
        toast({
          title: "Bankrekening gekoppeld!",
          description: `${result.data.accountHolder} - ${formatIban(result.data.iban)}`,
        });
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Authenticatie mislukt",
        description: "Kon niet inloggen bij je bank. Probeer opnieuw.",
        variant: "destructive"
      });
      setStep('accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('banks');
    setSelectedBank('');
    setSelectedAccount('');
    setAccounts([]);
    onClose();
  };

  const formatIban = (iban: string) => {
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(balance);
  };

  const selectedBankData = banks.find(bank => bank.id === selectedBank);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {step === 'accounts' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('banks')}
                className="p-1 h-6 w-6"
                data-testid="button-back-to-banks"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Building2 className="h-5 w-5" />
            <span>
              {step === 'banks' && 'Kies je bank'}
              {step === 'accounts' && `${selectedBankData?.name} rekeningen`}
              {step === 'authenticating' && 'Authenticeren...'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading && step === 'banks' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Banken laden...</span>
          </div>
        )}

        {step === 'banks' && !loading && (
          <div className="space-y-3">
            {banks.map((bank) => (
              <Button
                key={bank.id}
                variant="outline"
                className="w-full h-16 justify-start space-x-3 text-left"
                onClick={() => handleBankSelect(bank.id)}
                data-testid={`button-select-bank-${bank.id}`}
              >
                <div className="text-2xl">{bank.logo}</div>
                <div>
                  <div className="font-medium">{bank.name}</div>
                  <div className="text-sm text-gray-500">Nederlandse bank</div>
                </div>
              </Button>
            ))}
          </div>
        )}

        {step === 'accounts' && !loading && (
          <div className="space-y-4">
            <RadioGroup value={selectedAccount} onValueChange={setSelectedAccount}>
              {accounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={account.id} id={account.id} />
                    <Label htmlFor={account.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{account.accountHolder}</div>
                          <div className="text-sm text-gray-600 font-mono">
                            {formatIban(account.iban)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">{account.bankName}</div>
                          <div className="font-medium text-green-600">
                            {formatBalance(account.balance)}
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <Button
              onClick={handleAccountSelect}
              disabled={!selectedAccount}
              className="w-full"
              data-testid="button-authenticate-account"
            >
              Koppel deze rekening
            </Button>
          </div>
        )}

        {step === 'authenticating' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="text-center">
              <div className="font-medium">Authenticeren bij {selectedBankData?.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                Bezig met veilige verbinding maken...
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}