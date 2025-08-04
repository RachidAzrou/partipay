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
      <button 
        className="w-full p-6 text-left flex items-center justify-between touch-target hover:bg-gray-50 transition-colors rounded-2xl"
        onClick={onToggleExpand}
        data-testid="button-toggle-bill"
      >
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">Rekening #{today.getDate().toString().padStart(2, '0')}{(today.getMonth() + 1).toString().padStart(2, '0')}{today.getFullYear().toString().slice(-2)}01</h3>
          <p className="monarch-body mt-2">Restaurant De Blauwe Kater • Tafel 12</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900 mt-4">Totaalbedrag: € {billData.totalAmount}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center ml-4">
          <i className={`fas fa-chevron-down text-monarch-primary transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}></i>
        </div>
      </button>
      
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-2 font-mono text-sm animate-fade-in" data-testid="bill-details">
          {/* POS Header */}
          <div className="text-center mb-6 border-b border-gray-300 pb-4">
            <h4 className="text-base font-semibold text-gray-900">DE BLAUWE KATER</h4>
            <p className="monarch-caption mt-1">Grote Markt 8, 9000 Gent</p>
            <p className="monarch-caption">Tel: 09-123-45-67</p>
            <p className="monarch-caption mt-2">Tafel: 12 • {today.toLocaleDateString('nl-BE')} {today.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          
          {/* Items */}
          <div className="space-y-2">
            {billData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 text-sm py-1">
                <div className="col-span-6 truncate text-gray-900">{item.name}</div>
                <div className="col-span-2 text-center text-gray-500">{item.quantity}x</div>
                <div className="col-span-2 text-right text-gray-500">€{parseFloat(item.price).toFixed(2)}</div>
                <div className="col-span-2 text-right font-semibold text-monarch-primary tabular-nums">€{(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          
          {/* Totals */}
          <div className="border-t border-gray-300 pt-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotaal:</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>BTW (21%):</span>
              <span>€{btw.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2 text-gray-900">
              <span>TOTAAL:</span>
              <span>€{billData.totalAmount}</span>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-4 pt-3 border-t border-gray-300">
            <p>Bedankt voor uw bezoek!</p>
          </div>
        </div>
      )}
    </div>
  );
}
