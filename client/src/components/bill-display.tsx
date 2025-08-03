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
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <button 
        className="w-full p-4 text-left flex items-center justify-between"
        onClick={onToggleExpand}
        data-testid="button-toggle-bill"
      >
        <div>
          <h3 className="font-semibold text-gray-900">Rekening #1247</h3>
          <p className="text-sm text-gray-600">Restaurant De Gouden Leeuw</p>
          <p className="text-lg font-bold text-[hsl(24,_95%,_53%)] mt-1">€ {billData.totalAmount}</p>
        </div>
        <i className={`fas fa-chevron-down text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}></i>
      </button>
      
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3" data-testid="bill-details">
          {billData.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-b-0">
              <div>
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                <p className="text-xs text-gray-500">x{item.quantity}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">€ {item.price}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center font-semibold text-gray-900">
              <span>Totaal</span>
              <span>€ {billData.totalAmount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
