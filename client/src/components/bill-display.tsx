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
    <div className="parti-card overflow-hidden animate-slide-up">
      <button 
        className="w-full p-6 text-left flex items-center justify-between touch-target hover:bg-muted/50 transition-colors"
        onClick={onToggleExpand}
        data-testid="button-toggle-bill"
      >
        <div className="flex-1">
          <h3 className="parti-heading-3">Rekening #{today.getDate().toString().padStart(2, '0')}{(today.getMonth() + 1).toString().padStart(2, '0')}{today.getFullYear().toString().slice(-2)}01</h3>
          <p className="parti-body mt-1">Restaurant De Blauwe Kater • Tafel 12</p>
          <p className="text-2xl font-bold parti-text-primary mt-3">€ {billData.totalAmount}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center ml-4">
          <i className={`fas fa-chevron-down text-muted-foreground transition-transform duration-200 text-sm ${expanded ? 'rotate-180' : ''}`}></i>
        </div>
      </button>
      
      {expanded && (
        <div className="border-t bg-muted/30 p-6 space-y-2 font-mono text-sm animate-fade-in" style={{borderColor: 'var(--parti-border-light)'}} data-testid="bill-details">
          {/* POS Header */}
          <div className="text-center mb-6 border-b border-border pb-4">
            <h4 className="parti-heading-3">DE BLAUWE KATER</h4>
            <p className="parti-small mt-1">Grote Markt 8, 9000 Gent</p>
            <p className="parti-small">Tel: 09-123-45-67</p>
            <p className="parti-small mt-2">Tafel: 12 • {today.toLocaleDateString('nl-BE')} {today.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          
          {/* Items */}
          <div className="space-y-2">
            {billData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 text-sm py-1">
                <div className="col-span-6 truncate text-foreground">{item.name}</div>
                <div className="col-span-2 text-center text-muted-foreground">{item.quantity}x</div>
                <div className="col-span-2 text-right text-muted-foreground">€{parseFloat(item.price).toFixed(2)}</div>
                <div className="col-span-2 text-right font-semibold parti-text-primary">€{(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          
          {/* Totals */}
          <div className="border-t border-border pt-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotaal:</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>BTW (21%):</span>
              <span>€{btw.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 text-foreground" style={{borderColor: 'var(--parti-border-light)'}}>
              <span>TOTAAL:</span>
              <span>€{billData.totalAmount}</span>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground mt-4 pt-3 border-t border-border">
            <p>Bedankt voor uw bezoek!</p>
          </div>
        </div>
      )}
    </div>
  );
}
