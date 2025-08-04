import { IoReceiptOutline } from "react-icons/io5";

interface BillItem {
  name: string;
  price: string;
  quantity: number;
}

interface BillData {
  items: BillItem[];
  totalAmount: string;
}

interface BillDisplayProps {
  billData: BillData;
  expanded: boolean;
  onToggleExpand: () => void;
}

export default function BillDisplay({ billData, expanded, onToggleExpand }: BillDisplayProps) {
  const subtotal = billData.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const btw = subtotal * 0.21; // 21% BTW
  const today = new Date();
  
  return (
    <div className="monarch-widget overflow-hidden animate-slide-up">
      {/* Header with icon and title */}
      <div className="text-center space-y-3 p-3 border-b border-gray-200">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-[#f97315]">
          <IoReceiptOutline className="text-xl text-white" />
        </div>
        <div>
          <h1 className="monarch-title">Rekening gevonden!</h1>
          <p className="monarch-body">Restaurant De Blauwe Kater, Tafel 12</p>
        </div>
      </div>
      <button 
        className="w-full p-3 text-left flex items-center justify-between touch-target hover:bg-gray-50 transition-colors rounded-xl"
        onClick={onToggleExpand}
        data-testid="button-toggle-bill"
      >
        <div className="flex-1">
          
          <p className="monarch-body mt-1">Restaurant De Blauwe Kater • Tafel 12</p>
          <p className="text-sm text-monarch-primary mt-2 font-medium">Klik om volledige rekening te bekijken</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ml-3">
          <i className={`fas fa-chevron-down text-monarch-primary transition-transform duration-200 text-sm ${expanded ? 'rotate-180' : ''}`}></i>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-200 bg-white p-4 font-mono text-xs animate-fade-in" data-testid="bill-details">
          {/* POS Header */}
          <div className="text-center mb-4 pb-3 border-b-2 border-gray-800">
            <h4 className="text-lg font-bold text-gray-900 mb-1">DE BLAUWE KATER</h4>
            <p className="text-gray-700">Grote Markt 8, 9000 Gent</p>
            <p className="text-gray-700">Tel: 09-123-45-67</p>
            <p className="text-gray-700">BTW: BE0123.456.789</p>
            <div className="mt-2 pt-2 border-t border-gray-400">
              <p className="font-semibold">BON #{today.getDate().toString().padStart(2, '0')}{(today.getMonth() + 1).toString().padStart(2, '0')}{today.getFullYear().toString().slice(-2)}001</p>
              <p>Tafel: 12 | Kassa: 01</p>
              <p>{today.toLocaleDateString('nl-BE')} {today.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          
          {/* Items Header */}
          <div className="border-b border-gray-400 pb-1 mb-2">
            <div className="grid grid-cols-12 gap-1 text-xs font-semibold">
              <div className="col-span-6">ARTIKEL</div>
              <div className="col-span-2 text-center">AANTAL</div>
              <div className="col-span-2 text-right">PRIJS</div>
              <div className="col-span-2 text-right">TOTAAL</div>
            </div>
          </div>
          
          {/* Items */}
          <div className="space-y-1 mb-3">
            {billData.items.map((item, index) => (
              <div key={index}>
                <div className="grid grid-cols-12 gap-1 text-xs">
                  <div className="col-span-6 text-gray-900">{item.name}</div>
                  <div className="col-span-2 text-center text-gray-700">{item.quantity}</div>
                  <div className="col-span-2 text-right text-gray-700">€{parseFloat(item.price).toFixed(2)}</div>
                  <div className="col-span-2 text-right font-semibold">€{(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
                </div>
                <div className="text-xs text-gray-500 ml-1">
                  BTW: 21% | Art.nr: {1000 + index}
                </div>
              </div>
            ))}
          </div>
          
          {/* Totals Section */}
          <div className="border-t-2 border-gray-800 pt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Subtotaal (excl. BTW):</span>
              <span>€{(subtotal / 1.21).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>BTW (21%):</span>
              <span>€{btw.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-600 pt-1 mt-1">
              <div className="flex justify-between text-sm font-bold">
                <span>TOTAAL INCL. BTW:</span>
                <span>€{billData.totalAmount}</span>
              </div>
            </div>
          </div>
          
          {/* Payment Info */}
          <div className="mt-3 pt-2 border-t border-gray-400 text-xs text-gray-600">
            <p>Betaalmethode: Via PartiPay App</p>
            <p>Status: In behandeling</p>
          </div>
          
          {/* Footer */}
          <div className="text-center text-xs text-gray-500 mt-4 pt-3 border-t border-gray-400">
            <p className="font-semibold">Bedankt voor uw bezoek!</p>
            <p className="mt-1">Bewaar deze bon als bewijs van aankoop</p>
            <p className="mt-2 text-xs">
              Retour binnen 7 dagen mogelijk<br/>
              www.deblauwekatergent.be
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
