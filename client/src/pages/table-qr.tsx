import { useState, useEffect } from "react";
import { generateQRCode } from "@/lib/qr-utils";

export default function TableQR() {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [tableNumber, setTableNumber] = useState("12");
  const [restaurantName, setRestaurantName] = useState("De Blauwe Kater");

  useEffect(() => {
    // Generate QR code that points to the app homepage
    const appUrl = window.location.origin;
    generateQRCode(appUrl).then(setQrCodeUrl);
  }, []);

  const handleRegenerateQR = () => {
    const appUrl = window.location.origin;
    generateQRCode(appUrl).then(setQrCodeUrl);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">Tafel QR-code</h1>
          <p className="text-gray-600">
            Scan deze QR-code om je rekening te splitten met PartiPay
          </p>
        </div>

        {/* Restaurant Info */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant naam
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-monarch-primary focus:border-transparent"
                data-testid="input-restaurant-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tafel nummer
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-monarch-primary focus:border-transparent"
                data-testid="input-table-number"
              />
            </div>
          </div>

          {/* QR Code Display */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-8 border-2 border-dashed border-gray-300">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="Tafel QR Code" 
                  className="w-48 h-48 mx-auto"
                  data-testid="table-qr-code"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-200 rounded-lg mx-auto flex items-center justify-center">
                  <div className="text-gray-500">QR-code laden...</div>
                </div>
              )}
            </div>

            {/* Table Info on QR */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-gray-900">{restaurantName}</h2>
              <p className="text-lg font-semibold text-monarch-primary">Tafel {tableNumber}</p>
              <p className="text-sm text-gray-600">
                Scan om je rekening te splitten
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleRegenerateQR}
            className="w-full monarch-btn monarch-btn-secondary py-3"
            data-testid="button-regenerate-qr"
          >
            QR-code vernieuwen
          </button>
          
          <button
            onClick={handlePrint}
            className="w-full monarch-btn monarch-btn-primary py-3"
            data-testid="button-print-qr"
          >
            Print QR-code
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-start space-x-3">
            <i className="fas fa-info-circle text-orange-600 mt-1"></i>
            <div className="text-left">
              <h3 className="font-semibold text-orange-800 mb-2">Instructies:</h3>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Print deze QR-code en plaats op de tafel</li>
                <li>• Klanten scannen de code met hun telefoon</li>
                <li>• Ze worden naar PartiPay geleid om rekeningen te splitten</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .print-area, .print-area * {
            visibility: visible;
          }
          
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            text-align: center;
            padding: 20px;
          }
          
          @page {
            margin: 0.5in;
            size: A4;
          }
        }
      `}</style>

      {/* Hidden print area */}
      <div className="print-area hidden print:block fixed inset-0 bg-white">
        <div className="text-center space-y-6 pt-20">
          <h1 className="text-4xl font-bold text-gray-900">{restaurantName}</h1>
          <h2 className="text-2xl font-semibold text-monarch-primary">Tafel {tableNumber}</h2>
          
          {qrCodeUrl && (
            <div className="flex justify-center">
              <img 
                src={qrCodeUrl} 
                alt="Tafel QR Code" 
                className="w-64 h-64"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <p className="text-xl font-medium text-gray-800">
              Scan om je rekening te splitten
            </p>
            <p className="text-lg text-gray-600">
              Met PartiPay deel je eenvoudig je restaurantrekening
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}