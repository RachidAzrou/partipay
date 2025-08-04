import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { IoRestaurantOutline, IoQrCodeOutline } from 'react-icons/io5';

export default function TableQR() {
  const [currentUrl, setCurrentUrl] = useState('');
  
  useEffect(() => {
    // Generate a QR code URL that points to the app's scanning endpoint
    // This simulates what a restaurant's table QR would contain
    const baseUrl = window.location.origin;
    const tableData = {
      restaurant: "De Blauwe Kater",
      table: "12",
      billId: "De Blauwe Kater-12"
    };
    
    // Create a URL that when scanned, will trigger the QR scan endpoint
    const qrUrl = `${baseUrl}/?scan=${encodeURIComponent(JSON.stringify(tableData))}`;
    setCurrentUrl(qrUrl);
  }, []);

  const handleTestScan = () => {
    // Navigate to the main app with the scan parameter
    const tableData = {
      restaurant: "De Blauwe Kater", 
      table: "12",
      billId: "De Blauwe Kater-12"
    };
    const scanParam = encodeURIComponent(JSON.stringify(tableData));
    window.location.href = `/?scan=${scanParam}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center mx-auto mb-4">
            <IoRestaurantOutline className="text-2xl text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tafel QR Simulator</h1>
          <p className="text-gray-600">Test QR code voor Restaurant De Blauwe Kater, Tafel 12</p>
        </div>

        {/* QR Code Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center mb-4">
            <IoQrCodeOutline className="text-3xl text-orange-500 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-gray-900">Scan deze QR-code</h2>
            <p className="text-sm text-gray-600">Om de rekening te splitsen</p>
          </div>
          
          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl border-2 border-gray-100 mb-4">
            {currentUrl && (
              <QRCodeSVG 
                value={currentUrl}
                size={200}
                level="M"
                includeMargin={true}
                className="mx-auto"
              />
            )}
          </div>
          
          {/* Restaurant Info */}
          <div className="text-center text-sm text-gray-500 space-y-1">
            <p className="font-medium">Restaurant De Blauwe Kater</p>
            <p>Grote Markt 8, 9000 Gent</p>
            <p>Tafel 12</p>
          </div>
        </div>

        {/* Test Button */}
        <button
          onClick={handleTestScan}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
          data-testid="button-test-scan"
        >
          <IoQrCodeOutline className="text-lg" />
          <span>Test QR Scan</span>
        </button>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Hoe te gebruiken:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. Scan de QR-code met je camera app</li>
            <li>2. Of klik op "Test QR Scan" om direct te testen</li>
            <li>3. De app zal automatisch de rekening laden</li>
            <li>4. Begin met het splitsen van de rekening</li>
          </ul>
        </div>

        {/* Debug Info */}
        <div className="mt-4 bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-700 mb-2">QR Code Data:</h3>
          <p className="text-xs text-gray-600 font-mono break-all">{currentUrl}</p>
        </div>
      </div>
    </div>
  );
}