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
    <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg overflow-hidden shadow-lg">
      <button 
        className="w-full p-4 text-left flex items-center justify-between"
        onClick={onToggleExpand}
        data-testid="button-toggle-bill"
      >
        <div>
          <h3 className="font-semibold text-gray-900">Rekening #{today.getDate().toString().padStart(2, '0')}{(today.getMonth() + 1).toString().padStart(2, '0')}{today.getFullYear().toString().slice(-2)}01</h3>
          <p className="text-sm text-gray-600">Restaurant De Blauwe Kater • Tafel 12</p>
          <p className="text-lg font-bold text-[hsl(24,_95%,_53%)] mt-1">€ {billData.totalAmount}</p>
        </div>
        <i className={`fas fa-chevron-down text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}></i>
      </button>
      
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-1 font-mono text-sm" data-testid="bill-details">
          {/* POS Header */}
          <div className="text-center mb-4 border-b border-gray-200 pb-3">
            <h4 className="font-bold text-gray-900">DE BLAUWE KATER</h4>
            <p className="text-xs text-gray-600">Grote Markt 8, 9000 Gent</p>
            <p className="text-xs text-gray-600">Tel: 09-123-45-67</p>
            <p className="text-xs text-gray-600 mt-1">Tafel: 12 • {today.toLocaleDateString('nl-BE')} {today.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          
          {/* Items */}
          <div className="space-y-1">
            {billData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-1 text-xs">
                <div className="col-span-6 truncate">{item.name}</div>
                <div className="col-span-2 text-center">{item.quantity}x</div>
                <div className="col-span-2 text-right">€{parseFloat(item.price).toFixed(2)}</div>
                <div className="col-span-2 text-right font-semibold">€{(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          
          {/* Totals */}
          <div className="border-t border-gray-300 pt-2 mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Subtotaal:</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>BTW (21%):</span>
              <span>€{btw.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-gray-300 pt-1">
              <span>TOTAAL:</span>
              <span>€{billData.totalAmount}</span>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200">
            <p>Bedankt voor uw bezoek!</p>
          </div>
        </div>
      )}
    </div>
  );
}
