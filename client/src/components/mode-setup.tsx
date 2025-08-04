import { useState } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TbPlugConnected } from "react-icons/tb";

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
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [availableQuantities, setAvailableQuantities] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    billData.items.forEach((item, index) => {
      initial[index] = item.quantity;
    });
    return initial;
  });
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


  const handleQuantityChange = (index: number, change: number) => {
    const currentQuantity = selectedItems[index] || 0;
    const availableQuantity = availableQuantities[index] || 0;
    const newQuantity = Math.max(0, Math.min(availableQuantity, currentQuantity + change));
    
    // Calculate the difference in selection
    const quantityDifference = newQuantity - currentQuantity;
    
    setSelectedItems(prev => ({
      ...prev,
      [index]: newQuantity
    }));
    
    // Update available quantities - decrease when selecting, increase when deselecting
    setAvailableQuantities(prev => ({
      ...prev,
      [index]: prev[index] - quantityDifference
    }));
  };

  const calculateSelectedTotal = () => {
    return billData.items.reduce((total, item, index) => {
      const selectedQuantity = selectedItems[index] || 0;
      return total + parseFloat(item.price) * selectedQuantity;
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
        

        <div className="space-y-6 animate-slide-up">
          
        
          <div>
            {!bankLinked ? (
              <div className="monarch-widget">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-monarch-primary rounded-2xl flex items-center justify-center mx-auto">
                    <i className="fas fa-university text-white text-2xl"></i>
                  </div>
                  <div>
                    <p className="monarch-body mb-4">
                      Automatisch je IBAN koppelen voor snelle betalingen van deelnemers.
                    </p>
                  </div>
                  
                  <button 
                    className="monarch-btn monarch-btn-primary flex items-center justify-center space-x-2 mx-auto"
                    onClick={handleLinkBank}
                    data-testid="button-link-bank"
                  >
                    <TbPlugConnected className="text-xl" />
                    <span>Koppel bankrekening</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="monarch-card">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-monarch-green rounded-full flex items-center justify-center">
                    <TbPlugConnected className="text-white text-lg" />
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
            
          
            <div className="space-y-4">
              <h3 className="parti-heading-3">Selecteer jouw items:</h3>
              {billData.items.map((item, index) => {
                const selectedQuantity = selectedItems[index] || 0;
                const availableQuantity = availableQuantities[index] || 0;
                const isUnavailable = availableQuantity === 0;
                
                return (
                  <div key={index} className={`monarch-card p-4 transition-all duration-200 ${isUnavailable ? 'opacity-60 bg-gray-50 border-gray-200' : 'hover:shadow-md'} ${selectedQuantity > 0 ? 'ring-2 ring-monarch-primary ring-opacity-20 bg-orange-50' : ''}`}>
                    {/* Header with item name and selected badge */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`text-base font-semibold ${isUnavailable ? 'text-gray-500' : 'text-gray-900'}`}>
                        {item.name}
                      </h4>
                      {selectedQuantity > 0 && (
                        <div className="bg-monarch-primary text-white px-2 py-1 rounded-full text-xs font-medium">
                          {selectedQuantity}x
                        </div>
                      )}
                    </div>
                    
                    {/* Price and availability row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg font-bold ${isUnavailable ? 'text-gray-500' : 'text-monarch-primary'}`}>
                          €{item.price}
                        </span>
                        <span className="text-sm text-gray-500">per stuk</span>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                        availableQuantity === 0 
                          ? 'bg-red-100 text-red-700' 
                          : availableQuantity <= 2 
                          ? 'bg-orange-100 text-orange-700' 
                          : availableQuantity <= 5
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {availableQuantity === 0 ? (
                          <>
                            <i className="fas fa-times mr-1"></i>
                            Uitverkocht
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check mr-1"></i>
                            {availableQuantity} beschikbaar
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Quantity controls or unavailable message */}
                    {!isUnavailable ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200">
                          <button 
                            className="w-10 h-10 rounded-lg bg-white hover:bg-gray-100 flex items-center justify-center transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                            onClick={() => handleQuantityChange(index, -1)}
                            disabled={selectedQuantity === 0}
                            data-testid={`button-decrease-${index}`}
                          >
                            <i className="fas fa-minus text-gray-600"></i>
                          </button>
                          
                          <div className="w-12 text-center">
                            <span className="text-lg font-bold text-gray-900" data-testid={`quantity-${index}`}>
                              {selectedQuantity}
                            </span>
                          </div>
                          
                          <button 
                            className="w-10 h-10 rounded-lg bg-monarch-primary hover:bg-orange-600 text-white flex items-center justify-center transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                            onClick={() => handleQuantityChange(index, 1)}
                            disabled={selectedQuantity >= availableQuantity}
                            data-testid={`button-increase-${index}`}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                        
                        {selectedQuantity > 0 && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Subtotaal</div>
                            <div className="text-base font-bold text-monarch-primary">
                              €{(parseFloat(item.price) * selectedQuantity).toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4 bg-red-50 border border-red-200 rounded-lg">
                        <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                        <span className="text-sm text-red-700 font-medium">Item is niet meer beschikbaar</span>
                      </div>
                    )}
                  </div>
                );
              })}
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
