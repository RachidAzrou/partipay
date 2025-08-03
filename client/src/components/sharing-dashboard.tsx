import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { generateQRCode } from "@/lib/qr-utils";

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
  payments: Array<{
    id: string;
    participantId: string;
    amount: string;
    status: string;
  }>;
}

interface SharingDashboardProps {
  sessionData: SessionData;
}

export default function SharingDashboard({ sessionData: initialData }: SharingDashboardProps) {
  const [sessionData, setSessionData] = useState(initialData);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { connected } = useWebSocket(sessionData.session.id, (message) => {
    if (message.type === 'participant-joined') {
      setSessionData(prev => ({
        ...prev,
        participants: [...prev.participants, message.participant]
      }));
    } else if (message.type === 'payment-completed') {
      setSessionData(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === message.participantId 
            ? { ...p, hasPaid: true, paidAmount: message.payment.amount }
            : p
        ),
        payments: [...prev.payments, message.payment]
      }));
    } else if (message.type === 'session-completed') {
      setSessionCompleted(true);
      setSessionData(prev => ({ ...prev, session: { ...prev.session, isActive: false } }));
    }
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: { participantId: string; amount: number }) => {
      const res = await apiRequest('POST', `/api/sessions/${sessionData.session.id}/pay`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Betaling voltooid",
        description: "Je betaling is succesvol verwerkt!",
      });
    },
    onError: () => {
      toast({
        title: "Betalingsfout",
        description: "Er is iets misgegaan bij de betaling. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const sessionUrl = `${window.location.origin}/session/${sessionData.session.id}`;
    generateQRCode(sessionUrl).then(setQrCodeUrl);
  }, [sessionData.session.id]);

  const calculateProgress = () => {
    const totalPaid = sessionData.participants.reduce((sum, p) => sum + parseFloat(p.paidAmount || '0'), 0);
    const totalAmount = parseFloat(sessionData.session.totalAmount);
    return (totalPaid / totalAmount) * 100;
  };

  const paidCount = sessionData.participants.filter(p => p.hasPaid).length;
  const totalCount = sessionData.participants.length;

  const handleMockPayment = (participant: any) => {
    const amount = parseFloat(participant.expectedAmount || sessionData.session.totalAmount) / sessionData.participants.length;
    paymentMutation.mutate({
      participantId: participant.id,
      amount
    });
  };

  const handleShareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PartiPay - Doe mee!',
          text: `Scan deze QR-code om mee te betalen voor ${sessionData.session.restaurantName}`,
          url: `${window.location.origin}/session/${sessionData.session.id}`
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${window.location.origin}/session/${sessionData.session.id}`);
      toast({
        title: "Link gekopieerd",
        description: "De sessielink is naar je klembord gekopieerd",
      });
    }
  };

  if (sessionCompleted) {
    return (
      <div className="px-4 py-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center" data-testid="success-state">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check text-white text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-green-900 mb-2">Alle betalingen voltooid!</h3>
          <p className="text-sm text-green-800 mb-4">Bedankt voor het gebruik van PartiPay</p>
          <Button 
            className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
            onClick={() => window.location.href = '/'}
            data-testid="button-new-session"
          >
            Nieuwe rekening
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Deel met je vrienden</h2>
        <p className="text-sm text-gray-600 mt-1">Laat anderen deze QR-code scannen</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
        {qrCodeUrl ? (
          <img 
            src={qrCodeUrl} 
            alt="QR Code" 
            className="w-48 h-48 mx-auto mb-4"
            data-testid="qr-code"
          />
        ) : (
          <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <div className="text-gray-400">QR-code laden...</div>
          </div>
        )}
        <p className="text-sm text-gray-600">Sessie: <span className="font-mono text-xs">{sessionData.session.id.slice(0, 8).toUpperCase()}</span></p>
        <Button 
          className="mt-3 px-4 py-2 bg-[hsl(24,_95%,_53%)] text-white text-sm rounded-lg hover:bg-[hsl(24,_95%,_48%)]"
          onClick={handleShareQR}
          data-testid="button-share-qr"
        >
          <i className="fas fa-share mr-2"></i>
          Deel QR-code
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Deelnemers ({paidCount}/{totalCount})</h3>
        
        {sessionData.participants.map((participant) => (
          <div key={participant.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[hsl(24,_95%,_53%)] to-[hsl(38,_92%,_50%)] rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {participant.name}
                  {participant.isMainBooker && <span className="text-xs text-gray-500 ml-1">• Hoofdboeker</span>}
                </p>
                <p className="text-xs text-gray-500">
                  € {participant.expectedAmount || (parseFloat(sessionData.session.totalAmount) / sessionData.participants.length).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {participant.hasPaid ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">Betaald</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-yellow-600">Wachtend</span>
                  <Button
                    size="sm"
                    className="ml-2 bg-[hsl(24,_95%,_53%)] hover:bg-[hsl(24,_95%,_48%)]"
                    onClick={() => handleMockPayment(participant)}
                    disabled={paymentMutation.isPending}
                    data-testid={`button-pay-${participant.id}`}
                  >
                    Demo Betaal
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">Betalingsvoortgang</h4>
          <span className="text-sm text-gray-600">
            € {sessionData.participants.reduce((sum, p) => sum + parseFloat(p.paidAmount || '0'), 0).toFixed(2)} / € {sessionData.session.totalAmount}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className="bg-gradient-to-r from-[hsl(24,_95%,_53%)] to-[hsl(38,_92%,_50%)] h-2 rounded-full transition-all duration-500"
            style={{ width: `${calculateProgress()}%` }}
            data-testid="progress-bar"
          ></div>
        </div>
        <p className="text-xs text-gray-600 text-center">{paidCount} van {totalCount} personen hebben betaald</p>
      </div>

      <div className="fixed bottom-4 right-4 flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full shadow-lg ${connected ? 'bg-green-500' : 'bg-red-500'}`} 
             title={connected ? 'Verbonden' : 'Niet verbonden'}
             data-testid="connection-status">
        </div>
        <span className="text-xs text-gray-500">{connected ? 'Live' : 'Offline'}</span>
      </div>
    </div>
  );
}
