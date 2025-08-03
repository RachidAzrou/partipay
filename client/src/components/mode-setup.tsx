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
    <div className="px-4 py-6 space-y-6">
      <div className="text-center">
        <button 
          className="absolute left-4 top-20 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
          onClick={onBack}
          data-testid="button-back"
        >
          <i className="fas fa-arrow-left text-gray-600 text-sm"></i>
        </button>
        <h2 className="text-xl font-semibold text-gray-900">Jouw gegevens</h2>
        <p className="text-sm text-gray-600 mt-1">Vul je naam in om deel te nemen</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">Je naam *</Label>
          <Input
            type="text"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(24,_95%,_53%)] focus:border-transparent"
            placeholder="Voer je naam in"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="input-name"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">Kies je bank</Label>
          <div className="grid grid-cols-2 gap-3">
            {banks.map(bank => (
              <button
                key={bank.id}
                type="button"
                className={`p-3 rounded-xl border-2 transition-all ${
                  selectedBank === bank.id
                    ? 'border-[hsl(24,_95%,_53%)] bg-orange-50 text-[hsl(24,_95%,_53%)]'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setSelectedBank(bank.id)}
                data-testid={`button-select-${bank.id}`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{bank.logo}</div>
                  <div className="text-sm font-medium">{bank.name}</div>
                </div>
              </button>
            ))}
          </div>
          {selectedBank && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{banks.find(b => b.id === selectedBank)?.logo}</span>
                  <span className="text-sm font-medium text-green-800">
                    {banks.find(b => b.id === selectedBank)?.name} geselecteerd
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[hsl(24,_95%,_53%)] hover:bg-[hsl(24,_95%,_48%)] text-white px-3 py-1 text-xs"
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
                  <i className="fas fa-mobile-alt mr-1"></i>
                  Open app
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">Selecteer je bank voor snelle betalingen</p>
        </div>
      </div>

      {splitMode === 'equal' ? (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-2">
              <i className="fas fa-users mr-2"></i>
              Split the Bill
            </h3>
            <p className="text-sm text-orange-800">De rekening wordt gelijk verdeeld over alle deelnemers.</p>
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Aantal deelnemers</Label>
            <div className="flex items-center space-x-4">
              <button 
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
                onClick={() => setParticipantCount(Math.max(2, participantCount - 1))}
                data-testid="button-decrease-participants"
              >
                <i className="fas fa-minus text-gray-600"></i>
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-gray-900" data-testid="text-participant-count">{participantCount}</span>
                <p className="text-xs text-gray-500">personen</p>
              </div>
              <button 
                className="w-10 h-10 bg-[hsl(24,_95%,_53%)] rounded-full flex items-center justify-center"
                onClick={() => setParticipantCount(Math.min(8, participantCount + 1))}
                data-testid="button-increase-participants"
              >
                <i className="fas fa-plus text-white"></i>
              </button>
            </div>
            <div className="flex justify-center mt-3">
              <div className="bg-gray-100 rounded-full px-3 py-1">
                <span className="text-sm font-semibold text-gray-700">
                  € {(parseFloat(billData.totalAmount) / participantCount).toFixed(2)} per persoon
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              <i className="fas fa-receipt mr-2"></i>
              Pay Your Part
            </h3>
            <p className="text-sm text-blue-800">Selecteer de items die jij hebt besteld.</p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Selecteer jouw items:</h4>
            {billData.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    checked={selectedItems[index] || false}
                    onCheckedChange={() => handleItemToggle(index)}
                    className="data-[state=checked]:bg-[hsl(24,_95%,_53%)] data-[state=checked]:border-[hsl(24,_95%,_53%)]"
                    data-testid={`checkbox-item-${index}`}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    <p className="text-xs text-gray-500">€ {item.price}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">x{item.quantity} beschikbaar</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-100 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Jouw totaal:</span>
              <span className="text-lg font-bold text-[hsl(24,_95%,_53%)]" data-testid="text-selected-total">
                € {calculateSelectedTotal()}
              </span>
            </div>
          </div>
        </div>
      )}

      <Button 
        className="w-full bg-gradient-to-r from-[hsl(24,_95%,_53%)] to-[hsl(38,_92%,_50%)] text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
        onClick={handleContinue}
        disabled={!name.trim()}
        data-testid="button-continue"
      >
        <i className="fas fa-arrow-right mr-2"></i>
        Verder naar delen
      </Button>
    </div>
  );
}
