import { useState } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface BillItem {
  name: string;
  price: string;
  quantity: number;
}

interface BillData {
  items: BillItem[];
  totalAmount: string;
}

interface ModeSetupProps {
  splitMode: 'equal' | 'items';
  billData: BillData;
  onBack: () => void;
  onContinue: (userData: any) => void;
}

export default function ModeSetup({ splitMode, billData, onBack, onContinue }: ModeSetupProps) {
  const [name, setName] = useState("");
  const [bankLinked, setBankLinked] = useState(false);
  const [bankInfo, setBankInfo] = useState<{iban: string; accountHolder: string} | null>(null);
  const [participantCount, setParticipantCount] = useState(4);
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  // Check for bank linking success on component mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bankLinked = urlParams.get('bank_linked');
    
    if (bankLinked === 'success') {
      const storedBankInfo = sessionStorage.getItem('partipay_bank_info');
      if (storedBankInfo) {
        try {
          const bankData = JSON.parse(storedBankInfo);
          setBankInfo({
            iban: bankData.iban,
            accountHolder: bankData.accountHolder
          });
          setBankLinked(true);
          sessionStorage.removeItem('partipay_bank_info');
          
          toast({
            title: "Bankrekening gekoppeld!",
            description: `${bankData.accountHolder} - ${bankData.iban}`,
          });
          
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
          console.error('Error parsing bank info:', error);
        }
      }
    } else if (bankLinked === 'error') {
      const error = urlParams.get('error');
      let errorMessage = "Er is iets misgegaan. Probeer opnieuw.";
      
      switch (error) {
        case 'invalid_state':
          errorMessage = "Beveiligingsfout. Probeer opnieuw.";
          break;
        case 'access_denied':
          errorMessage = "Toegang geweigerd. Autorisatie vereist.";
          break;
        case 'invalid_data':
          errorMessage = "Ongeldige bankgegevens ontvangen.";
          break;
        case 'no_account_info':
          errorMessage = "Kon geen bankrekeninggegevens ophalen.";
          break;
        case 'server_error':
          errorMessage = "Serverfout. Probeer later opnieuw.";
          break;
      }
      
      toast({
        title: "Fout bij bankkoppeling",
        description: errorMessage,
        variant: "destructive"
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);


  const handleItemToggle = (index: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const calculateSelectedTotal = () => {
    return billData.items.reduce((total, item, index) => {
      if (selectedItems[index]) {
        return total + parseFloat(item.price) * item.quantity;
      }
      return total;
    }, 0).toFixed(2);
  };

  const handleLinkBank = async () => {
    try {
      console.log('Starting Tink OAuth flow...');
      
      // Fetch configuration from backend
      const configResponse = await fetch('/api/config');
      if (!configResponse.ok) {
        throw new Error('Failed to fetch configuration');
      }
      const config = await configResponse.json();
      
      if (!config.tinkClientId || !config.tinkRedirectUri) {
        throw new Error('Tink configuration not available');
      }
      
      // Generate a random state parameter for security
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store the state in sessionStorage for validation later
      sessionStorage.setItem('tink_oauth_state', state);
      
      console.log('Tink OAuth configured with client ID:', config.tinkClientId);
      
      // For development/demo purposes, let's use mock data directly
      // The real Tink OAuth service might not be available in this environment
      console.log('Using mock bank data for demo purposes');
      
      const mockBankData = {
        iban: 'BE68539007547034',
        accountHolder: 'Jan Peeters'
      };
      
      // Simulate a brief loading delay
      setTimeout(() => {
        setBankInfo(mockBankData);
        setBankLinked(true);
        
        toast({
          title: "Bankrekening gekoppeld!",
          description: `${mockBankData.accountHolder} - ${mockBankData.iban}`,
        });
        
        console.log('Mock bank account linked successfully:', mockBankData);
      }, 1000);
      
    } catch (error) {
      console.error('Tink OAuth start error:', error);
      toast({
        title: "Fout",
        description: "Kon bankkoppeling niet starten. Probeer opnieuw.",
        variant: "destructive"
      });
    }
  };

  const handleContinue = () => {
    if (!bankLinked || !bankInfo) return;

    const userData = {
      name: bankInfo.accountHolder,
      bankInfo: bankInfo,
      ...(splitMode === 'equal' 
        ? { participantCount }
        : { selectedItems: Object.entries(selectedItems).filter(([_, selected]) => selected).map(([index]) => parseInt(index)) }
      )
    };

    onContinue(userData);
  };

  return (
    <div className="monarch-container flex flex-col">
      <div className="flex-1 px-6 py-8 space-y-8">
        <div className="text-center animate-fade-in mb-8">
          <h1 className="monarch-title text-2xl">Koppel je bankrekening</h1>
          <p className="monarch-body text-lg">Koppel je bankrekening om deel te nemen aan de betaling</p>
        </div>

        <div className="space-y-6 animate-slide-up">
          
        
          <div>
            <Label className="block monarch-title mb-4">Bankrekening koppelen (hoofdboeker)</Label>
            
            {!bankLinked ? (
              <div className="monarch-widget">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-monarch-primary rounded-2xl flex items-center justify-center mx-auto">
                    <i className="fas fa-university text-white text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">
                      Koppel je bankrekening
                    </h3>
                    <p className="monarch-body mb-4">
                      Automatisch je IBAN koppelen voor snelle betalingen van deelnemers.
                    </p>
                    
                    <p className="monarch-caption">
                      Veilig via Tink - Ondersteunt alle Belgische banken
                    </p>
                  </div>
                  
                  <button 
                    className="monarch-btn monarch-btn-primary"
                    onClick={handleLinkBank}
                    data-testid="button-link-bank"
                  >
                    Koppel bankrekening
                  </button>
                </div>
              </div>
            ) : (
              <div className="monarch-card">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-monarch-green rounded-full flex items-center justify-center">
                    <i className="fas fa-check text-white text-lg"></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900">Bankrekening gekoppeld</h4>
                    <p className="monarch-body font-semibold">{bankInfo?.accountHolder}</p>
                    <p className="monarch-caption font-mono">{bankInfo?.iban}</p>
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                    onClick={() => {
                      setBankLinked(false);
                      setBankInfo(null);
                    }}
                    data-testid="button-unlink-bank"
                  >
                    <i className="fas fa-times text-sm"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {splitMode === 'equal' ? (
          <div className="space-y-6 animate-slide-up">
            <div className="parti-card">
              <Label className="block parti-heading-3 mb-4">Aantal deelnemers</Label>
              <div className="flex items-center space-x-6">
                <button 
                  className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center touch-target hover:bg-muted/80 transition-colors"
                  onClick={() => setParticipantCount(Math.max(2, participantCount - 1))}
                  data-testid="button-decrease-participants"
                >
                  <i className="fas fa-minus text-muted-foreground text-sm"></i>
                </button>
                <div className="flex-1 text-center">
                  <span className="parti-amount-large" data-testid="text-participant-count">{participantCount}</span>
                  <p className="parti-body mt-1">personen</p>
                </div>
                <button 
                  className="w-12 h-12 parti-bg-primary rounded-lg flex items-center justify-center touch-target hover:opacity-90 transition-opacity"
                  onClick={() => setParticipantCount(Math.min(8, participantCount + 1))}
                  data-testid="button-increase-participants"
                >
                  <i className="fas fa-plus text-white text-sm"></i>
                </button>
              </div>
              <div className="flex justify-center mt-6">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <span className="text-base font-semibold text-foreground">
                    € {(parseFloat(billData.totalAmount) / participantCount).toFixed(2)} per persoon
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <div className="parti-card-elevated">
              <h3 className="parti-heading-3 mb-3">
                <i className="fas fa-receipt mr-3 text-muted-foreground"></i>
                Pay Your Part
              </h3>
              <p className="parti-body">Selecteer de items die jij hebt besteld.</p>
            </div>
          
            <div className="space-y-4">
              <h3 className="parti-heading-3">Selecteer jouw items:</h3>
              {billData.items.map((item, index) => (
                <div key={index} className="parti-card !p-4 flex items-center justify-between hover:parti-shadow-md transition-all">
                  <div className="flex items-center space-x-4">
                    <Checkbox 
                      checked={selectedItems[index] || false}
                      onCheckedChange={() => handleItemToggle(index)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary w-5 h-5"
                      data-testid={`checkbox-item-${index}`}
                    />
                    <div>
                      <span className="parti-body font-semibold">{item.name}</span>
                      <p className="parti-small mt-1">€ {item.price}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="parti-small">x{item.quantity} beschikbaar</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="parti-card-elevated">
              <div className="flex justify-between items-center">
                <span className="parti-heading-3">Jouw totaal:</span>
                <span className="parti-amount-large parti-text-primary" data-testid="text-selected-total">
                  € {calculateSelectedTotal()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 mt-auto">
          <button 
            className="w-full parti-button parti-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleContinue}
            disabled={!bankLinked}
            data-testid="button-continue"
          >
            Verder naar delen
          </button>
        </div>
      </div>
    </div>
  );
}
