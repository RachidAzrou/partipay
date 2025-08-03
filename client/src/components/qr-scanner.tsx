import { Button } from "@/components/ui/button";

interface QRScannerProps {
  onScan: () => void;
  isScanning: boolean;
  scannedSuccess: boolean;
}

export default function QRScanner({ onScan, isScanning, scannedSuccess }: QRScannerProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-r from-[hsl(24,_95%,_53%)] to-[hsl(38,_92%,_50%)] rounded-full flex items-center justify-center mx-auto">
          <i className="fas fa-qrcode text-2xl text-white"></i>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Scan QR-code aan je tafel</h2>
          <p className="text-sm text-gray-600">Scan de code om je rekening op te halen</p>
        </div>
      </div>

      <div className="relative">
        <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white rounded-lg relative">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-[hsl(24,_95%,_53%)] rounded-tl-lg"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-[hsl(24,_95%,_53%)] rounded-tr-lg"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-[hsl(24,_95%,_53%)] rounded-bl-lg"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-[hsl(24,_95%,_53%)] rounded-br-lg"></div>
            </div>
          </div>
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-0.5 bg-[hsl(24,_95%,_53%)] animate-pulse"></div>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">Plaats de QR-code in het midden van het scherm</p>
        
        <div className="text-center mt-4">
          <Button 
            onClick={onScan}
            disabled={isScanning}
            className="bg-[hsl(24,_95%,_53%)] hover:bg-[hsl(24,_95%,_48%)]"
            data-testid="button-scan-qr"
          >
            {isScanning ? 'Scannen...' : 'Demo: Scan QR-code'}
          </Button>
        </div>
      </div>

      {scannedSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center" data-testid="scan-success">
          <i className="fas fa-check-circle text-green-500 text-2xl mb-2"></i>
          <p className="text-green-800 font-medium">QR-code gescand!</p>
          <p className="text-green-600 text-sm">Restaurant De Gouden Leeuw, Tafel 7</p>
        </div>
      )}
    </div>
  );
}
