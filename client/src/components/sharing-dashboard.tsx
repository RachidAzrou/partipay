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
    participantCount: number;
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
  const [showQRModal, setShowQRModal] = useState(false);
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
    // For split mode, calculate expected total based on participant count
    const totalAmount = parseFloat(sessionData.session.totalAmount);
    const expectedTotal = sessionData.session.splitMode === 'equal' 
      ? (totalAmount / totalCount) * actualParticipants
      : totalAmount;
    
    const totalPaid = sessionData.participants.reduce((sum, p) => sum + parseFloat(p.paidAmount || '0'), 0);
    return expectedTotal > 0 ? (totalPaid / expectedTotal) * 100 : 0;
  };

  const paidCount = sessionData.participants.filter(p => p.hasPaid).length;
  const totalCount = sessionData.session.participantCount || sessionData.participants.length;
  const actualParticipants = sessionData.participants.length;
  const waitingForParticipants = totalCount - actualParticipants;

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
        <div className="monarch-widget text-center" data-testid="success-state">
          <div className="w-20 h-20 bg-monarch-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check text-white text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alle betalingen voltooid!</h3>
          <p className="monarch-body mb-8">Bedankt voor het gebruik van PartiPay</p>
          <button 
            className="monarch-btn monarch-btn-primary"
            onClick={() => window.location.href = '/'}
            data-testid="button-new-session"
          >
            Nieuwe rekening
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="monarch-container bg-background flex flex-col">
      <div className="flex-1 px-6 py-8 space-y-8">
      
      
      <div className="monarch-widget text-center animate-slide-up">
        <h1 className="monarch-title text-2xl mb-3">Deel met je vrienden</h1>
        <p className="monarch-body text-lg mb-6">Laat anderen deze QR-code scannen om mee te betalen</p>
        <p className="monarch-body mb-6">Sessie: <span className="font-mono monarch-caption bg-muted px-3 py-1 rounded-full">{sessionData.session.id.slice(0, 8).toUpperCase()}</span></p>
        <button 
          className="monarch-btn monarch-btn-primary touch-target"
          onClick={() => setShowQRModal(true)}
          data-testid="button-share-qr"
        >
          Deel QR-code
        </button>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Deelnemers ({actualParticipants}/{totalCount})</h2>
        
        {/* Payment Progress Bar */}
        {(() => {
          const totalAmount = parseFloat(sessionData.session.totalAmount);
          const totalPaid = sessionData.participants.reduce((sum, p) => {
            return sum + (p.hasPaid ? parseFloat(p.expectedAmount || (totalAmount / totalCount).toString()) : 0);
          }, 0);
          const progressPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
          
          return (
            <div className="monarch-card p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Betalingsvoortgang</span>
                <span className="text-sm font-medium text-gray-900">
                  € {totalPaid.toFixed(2)} / € {totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-monarch-primary h-3 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  data-testid="payment-progress-bar"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{Math.round(progressPercentage)}% betaald</span>
                <span>Nog € {(totalAmount - totalPaid).toFixed(2)} te gaan</span>
              </div>
            </div>
          );
        })()}
        
        {sessionData.participants.map((participant, index) => (
          <div key={participant.id} className="monarch-card flex items-center justify-between animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-monarch-primary rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900 mb-2">
                  {participant.name}
                  {participant.isMainBooker && <span className="monarch-caption ml-2 text-muted-foreground">• Hoofdboeker</span>}
                </p>
                <p className="text-base text-gray-900 leading-relaxed font-semibold tabular-nums">
                  {participant.isMainBooker 
                    ? `€ ${(parseFloat(sessionData.session.totalAmount) / totalCount).toFixed(2)} (deel)`
                    : `€ ${participant.expectedAmount || (parseFloat(sessionData.session.totalAmount) / sessionData.participants.length).toFixed(2)}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {participant.hasPaid ? (
                <>
                  <div className="w-2 h-2 bg-monarch-green rounded-full"></div>
                  <span className="text-base text-gray-900 leading-relaxed font-semibold text-monarch-green">Betaald</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="monarch-body font-medium text-yellow-600">Wachtend</span>
                  <button
                    className="ml-3 monarch-btn monarch-btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => handleMockPayment(participant)}
                    disabled={paymentMutation.isPending}
                    data-testid={`button-pay-${participant.id}`}
                  >
                    Demo Betaal
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        
        
        
        {/* Show waiting slots for remaining participants */}
        {waitingForParticipants > 0 && Array.from({ length: waitingForParticipants }, (_, index) => (
          <div key={`waiting-${index}`} className="monarch-card flex items-center justify-between animate-slide-up opacity-50" style={{animationDelay: `${(sessionData.participants.length + index) * 0.1}s`}}>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-gray-500"></i>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-500 mb-2">
                  Wachtend op deelnemer...
                </p>
                <p className="text-base text-gray-500 leading-relaxed font-semibold tabular-nums">
                  € {(parseFloat(sessionData.session.totalAmount) / totalCount).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <span className="monarch-body font-medium text-gray-500">Wachtend</span>
            </div>
          </div>
        ))}
      </div>
      </div>
      
      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Scan QR-code</h3>
              <button 
                onClick={() => setShowQRModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                data-testid="button-close-qr"
              >
                <i className="fas fa-times text-gray-700"></i>
              </button>
            </div>
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="w-64 h-64 mx-auto mb-6 rounded-2xl border"
                data-testid="qr-code-modal"
              />
            ) : (
              <div className="w-64 h-64 bg-muted rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <div className="monarch-body">QR-code laden...</div>
              </div>
            )}
            <p className="monarch-body mb-6">Laat vrienden deze code scannen om mee te betalen</p>
            <button 
              className="monarch-btn monarch-btn-secondary touch-target w-full"
              onClick={handleShareQR}
              data-testid="button-share-link"
            >
              Deel link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
