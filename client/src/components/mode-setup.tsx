import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [selectedBank, setSelectedBank] = useState("");
  const [participantCount, setParticipantCount] = useState(4);
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});

  const banks = [
    { id: 'kbc', name: 'KBC Bank', logo: '🏦', deeplink: 'kbc://payment' },
    { id: 'belfius', name: 'Belfius Bank', logo: '🔷', deeplink: 'belfius://payment' },
    { id: 'ing', name: 'ING België', logo: '🧡', deeplink: 'ing://payment' },
    { id: 'bnp', name: 'BNP Paribas Fortis', logo: '🟢', deeplink: 'bnpparibas://payment' },
    { id: 'argenta', name: 'Argenta', logo: '🔵', deeplink: 'argenta://payment' },
    { id: 'axa', name: 'AXA Bank Belgium', logo: '🅰️', deeplink: 'axa://payment' },
    { id: 'crelan', name: 'Crelan', logo: '🟡', deeplink: 'crelan://payment' },
    { id: 'vdk', name: 'VDK Bank', logo: '🏛️', deeplink: 'vdk://payment' }
  ];

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

  const handleContinue = () => {
    if (!name.trim()) return;

    const userData = {
      name: name.trim(),
      selectedBank: selectedBank,
      ...(splitMode === 'equal' 
        ? { participantCount }
        : { selectedItems: Object.entries(selectedItems).filter(([_, selected]) => selected).map(([index]) => parseInt(index)) }
      )
    };

    onContinue(userData);
  };

  return (
    <div className="parti-container bg-background flex flex-col">
      <div className="flex-1 px-6 py-8 space-y-8">
        <div className="text-center relative animate-fade-in">
          <button 
            className="absolute left-0 top-2 w-12 h-12 parti-card rounded-full flex items-center justify-center touch-target"
            onClick={onBack}
            data-testid="button-back"
          >
            <i className="fas fa-arrow-left text-foreground text-lg"></i>
          </button>
          <h1 className="text-3xl font-bold text-foreground mt-2">Jouw gegevens</h1>
          <p className="text-lg text-muted-foreground mt-2">Vul je naam in om deel te nemen</p>
        </div>

        <div className="space-y-6 animate-slide-up">
          <div>
            <Label className="block text-lg font-semibold text-foreground mb-3">Je naam *</Label>
            <Input
              type="text"
              className="w-full px-6 py-4 bg-card border border-border rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent parti-shadow transition-all"
              placeholder="Voer je naam in"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-name"
            />
          </div>
        
          <div>
            <Label className="block text-lg font-semibold text-foreground mb-4">Kies je bank</Label>
            <div className="grid grid-cols-2 gap-4">
              {banks.map(bank => (
                <button
                  key={bank.id}
                  type="button"
                  className={`p-4 rounded-2xl border-2 transition-all touch-target ${
                    selectedBank === bank.id
                      ? 'border-primary bg-primary/10 text-primary parti-shadow-lg'
                      : 'parti-card border-border text-foreground hover:border-primary/50 hover:parti-shadow'
                  }`}
                  onClick={() => setSelectedBank(bank.id)}
                  data-testid={`button-select-${bank.id}`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">{bank.logo}</div>
                    <div className="text-sm font-semibold">{bank.name}</div>
                  </div>
                </button>
              ))}
            </div>
            {selectedBank && (
              <div className="mt-6 parti-card-elevated p-6 animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{banks.find(b => b.id === selectedBank)?.logo}</span>
                    <span className="text-lg font-semibold text-foreground">
                      {banks.find(b => b.id === selectedBank)?.name} geselecteerd
                    </span>
                  </div>
                  <button
                    type="button"
                    className="parti-button parti-button-primary text-sm px-4 py-2"
                    onClick={() => {
                      const bank = banks.find(b => b.id === selectedBank);
                      if (bank) {
                        // Try to open bank app with fallback
                        const userAgent = navigator.userAgent.toLowerCase();
                        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
                          // iOS: try deep link, fallback to app store
                          window.location.href = bank.deeplink;
                          setTimeout(() => {
                            window.location.href = `https://apps.apple.com/search?term=${bank.name}`;
                          }, 2000);
                        } else if (userAgent.includes('android')) {
                          // Android: try deep link, fallback to play store
                          window.location.href = bank.deeplink;
                          setTimeout(() => {
                            window.location.href = `https://play.google.com/store/search?q=${bank.name}`;
                          }, 2000);
                        } else {
                          // Desktop/other: show message
                          alert(`Open je ${bank.name} app op je telefoon om te betalen.`);
                        }
                      }
                    }}
                    data-testid="button-open-bank-app"
                  >
                    <i className="fas fa-mobile-alt mr-2"></i>
                    Open app
                  </button>
                </div>
              </div>
            )}
            <p className="text-base text-muted-foreground mt-4">Selecteer je bank voor snelle betalingen</p>
          </div>
        </div>

        {splitMode === 'equal' ? (
          <div className="space-y-6 animate-slide-up">
            <div className="parti-card p-6">
              <Label className="block text-lg font-semibold text-foreground mb-4">Aantal deelnemers</Label>
              <div className="flex items-center space-x-6">
                <button 
                  className="w-14 h-14 bg-muted rounded-full flex items-center justify-center touch-target hover:bg-muted/80 transition-colors"
                  onClick={() => setParticipantCount(Math.max(2, participantCount - 1))}
                  data-testid="button-decrease-participants"
                >
                  <i className="fas fa-minus text-foreground text-lg"></i>
                </button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-bold text-foreground" data-testid="text-participant-count">{participantCount}</span>
                  <p className="text-base text-muted-foreground mt-1">personen</p>
                </div>
                <button 
                  className="w-14 h-14 parti-gradient rounded-full flex items-center justify-center touch-target parti-shadow hover:parti-shadow-lg transition-all"
                  onClick={() => setParticipantCount(Math.min(8, participantCount + 1))}
                  data-testid="button-increase-participants"
                >
                  <i className="fas fa-plus text-white text-lg"></i>
                </button>
              </div>
              <div className="flex justify-center mt-6">
                <div className="parti-card px-6 py-3">
                  <span className="text-lg font-bold text-primary">
                    € {(parseFloat(billData.totalAmount) / participantCount).toFixed(2)} per persoon
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <div className="parti-card-elevated p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <h3 className="text-xl font-bold text-blue-900 mb-3">
                <i className="fas fa-receipt mr-3"></i>
                Pay Your Part
              </h3>
              <p className="text-base text-blue-800">Selecteer de items die jij hebt besteld.</p>
            </div>
          
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Selecteer jouw items:</h3>
              {billData.items.map((item, index) => (
                <div key={index} className="parti-card p-4 flex items-center justify-between hover:parti-shadow-lg transition-all">
                  <div className="flex items-center space-x-4">
                    <Checkbox 
                      checked={selectedItems[index] || false}
                      onCheckedChange={() => handleItemToggle(index)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary w-5 h-5"
                      data-testid={`checkbox-item-${index}`}
                    />
                    <div>
                      <span className="text-base font-semibold text-foreground">{item.name}</span>
                      <p className="text-sm text-muted-foreground mt-1">€ {item.price}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">x{item.quantity} beschikbaar</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="parti-card-elevated p-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-semibold text-foreground">Jouw totaal:</span>
                <span className="text-2xl font-bold text-primary" data-testid="text-selected-total">
                  € {calculateSelectedTotal()}
                </span>
              </div>
            </div>
          </div>
        )}

        <button 
          className="w-full parti-button parti-button-primary mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleContinue}
          disabled={!name.trim()}
          data-testid="button-continue"
        >
          <i className="fas fa-arrow-right mr-3"></i>
          Verder naar delen
        </button>
      </div>
    </div>
  );
}
