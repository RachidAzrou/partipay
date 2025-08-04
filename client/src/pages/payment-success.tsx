import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generateReceiptPDF } from "@/lib/pdf-utils";

interface SessionData {
  session: {
    id: string;
    restaurantName: string;
    tableNumber: string;
    splitMode: string;
    totalAmount: string;
    isActive: boolean;
  };
  participants: Array<{
    id: string;
    name: string;
    hasPaid: boolean;
    paidAmount: string;
    expectedAmount: string;
    isMainBooker: boolean;
  }>;
  billItems: Array<{
    id: string;
    name: string;
    price: string;
    quantity: number;
  }>;
  itemClaims: Array<{
    participantId: string;
    billItemId: string;
    quantity: number;
  }>;
}

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/payment-success/:sessionId");
  const { toast } = useToast();
  const [downloadingPDF, setDownloadingPDF] = useState<'full' | 'personal' | null>(null);

  const sessionQuery = useQuery({
    queryKey: ['/api/sessions', params?.sessionId],
    enabled: !!params?.sessionId,
  });

  const handleDownloadFullReceipt = async () => {
    if (!sessionQuery.data) return;
    
    setDownloadingPDF('full');
    try {
      await generateReceiptPDF(sessionQuery.data, 'full');
      toast({
        title: "PDF gedownload",
        description: "Volledige rekening is gedownload als PDF",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon PDF niet genereren. Probeer opnieuw.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPDF(null);
    }
  };

  const handleDownloadPersonalReceipt = async () => {
    if (!sessionQuery.data) return;
    
    setDownloadingPDF('personal');
    try {
      await generateReceiptPDF(sessionQuery.data, 'personal');
      toast({
        title: "PDF gedownload",
        description: "Persoonlijke rekening is gedownload als PDF",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon PDF niet genereren. Probeer opnieuw.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPDF(null);
    }
  };

  if (!match || !params?.sessionId) {
    return (
      <div className="monarch-container flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sessie niet gevonden</h1>
          <Button onClick={() => setLocation('/')}>
            Terug naar home
          </Button>
        </div>
      </div>
    );
  }

  if (sessionQuery.isLoading) {
    return (
      <div className="monarch-container flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Sessie laden...</p>
        </div>
      </div>
    );
  }

  if (sessionQuery.error || !sessionQuery.data) {
    return (
      <div className="monarch-container flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Fout bij laden sessie</h1>
          <Button onClick={() => setLocation('/')}>
            Terug naar home
          </Button>
        </div>
      </div>
    );
  }

  const sessionData = sessionQuery.data as SessionData;
  const isPayYourPart = sessionData.session.splitMode === 'items';
  const mainBooker = sessionData.participants.find(p => p.isMainBooker);

  return (
    <div className="monarch-container flex flex-col min-h-screen">
      <div className="flex-1 px-4 py-6 space-y-6">
        
        {/* Success Header */}
        <div className="text-center space-y-4 animate-slide-up">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto bg-[#f97315]">
            <i className="fas fa-check text-white text-3xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Betaling succesvol!</h1>
            <p className="text-gray-600 mb-4">
              Je betaling voor {sessionData.session.restaurantName} is verwerkt
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-green-800 font-medium">Jij hebt betaald:</span>
                <span className="text-green-900 font-bold text-lg">
                  € {(() => {
                    // For "equal" split, show amount per participant
                    if (sessionData.session.splitMode === 'equal') {
                      return (parseFloat(sessionData.session.totalAmount) / sessionData.participants.length).toFixed(2);
                    }
                    // For "items" split, try to find current participant's paid amount
                    // If we can't determine it, show the average expected amount
                    const paidParticipant = sessionData.participants.find(p => p.hasPaid && !p.isMainBooker);
                    if (paidParticipant && paidParticipant.paidAmount) {
                      return parseFloat(paidParticipant.paidAmount).toFixed(2);
                    }
                    // Fallback: show average of expected amounts for non-main-bookers
                    const nonMainBookers = sessionData.participants.filter(p => !p.isMainBooker);
                    if (nonMainBookers.length > 0) {
                      const avgExpected = nonMainBookers.reduce((sum, p) => sum + parseFloat(p.expectedAmount || '0'), 0) / nonMainBookers.length;
                      return avgExpected.toFixed(2);
                    }
                    return '0.00';
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Download Options */}
        <div className="space-y-4 animate-slide-up" style={{animationDelay: '0.05s'}}>
          
          {/* Full Receipt Option */}
          <div className="monarch-card">
            <div className="flex items-center justify-center">
              <Button
                onClick={handleDownloadFullReceipt}
                disabled={downloadingPDF === 'full'}
                className="monarch-btn monarch-btn-primary"
                data-testid="button-download-full-receipt"
              >
                {downloadingPDF === 'full' ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Genereren...
                  </>
                ) : (
                  <>
                    <i className="fas fa-download mr-2"></i>
                    Download de rekening
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Personal Receipt Option (only for Pay Your Part) */}
          {isPayYourPart && mainBooker && (
            <div className="monarch-card">
              <div className="flex items-center justify-center">
                <Button
                  onClick={handleDownloadPersonalReceipt}
                  disabled={downloadingPDF === 'personal'}
                  className="monarch-btn monarch-btn-secondary"
                  data-testid="button-download-personal-receipt"
                >
                  {downloadingPDF === 'personal' ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Genereren...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download mr-2"></i>
                      Download persoonlijke rekening
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Session Summary */}
        <div className="monarch-card animate-slide-up" style={{animationDelay: '0.1s'}}>
          <h3 className="font-semibold text-gray-900 mb-3">Sessie overzicht</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Restaurant:</span>
              <span className="font-medium">{sessionData.session.restaurantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tafel:</span>
              <span className="font-medium">{sessionData.session.tableNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Splitsingsmodus:</span>
              <span className="font-medium">
                {isPayYourPart ? 'Pay your Part' : 'Split the Bill'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deelnemers:</span>
              <span className="font-medium">{sessionData.participants.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}