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
        <div className="parti-card-elevated bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 text-center" data-testid="success-state">
          <div className="w-16 h-16 parti-bg-accent rounded-full flex items-center justify-center mx-auto mb-4 parti-shadow">
            <i className="fas fa-check text-white text-2xl"></i>
          </div>
          <h3 className="parti-heading-3 parti-text-accent mb-2">Alle betalingen voltooid!</h3>
          <p className="parti-body mb-4">Bedankt voor het gebruik van PartiPay</p>
          <button 
            className="parti-button parti-button-accent"
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
    <div className="parti-container bg-background flex flex-col">
      <div className="flex-1 px-6 py-8 space-y-8">
      
      
      <div className="text-center animate-fade-in">
        <h1 className="parti-heading-1">Deel met je vrienden</h1>
        <p className="parti-body text-lg mt-2">Laat anderen deze QR-code scannen</p>
      </div>

      <div className="parti-card-elevated p-8 text-center animate-slide-up">
        {qrCodeUrl ? (
          <img 
            src={qrCodeUrl} 
            alt="QR Code" 
            className="w-56 h-56 mx-auto mb-6 rounded-2xl parti-shadow"
            data-testid="qr-code"
          />
        ) : (
          <div className="w-56 h-56 parti-surface-muted rounded-2xl mx-auto mb-6 flex items-center justify-center parti-shadow">
            <div className="parti-body">QR-code laden...</div>
          </div>
        )}
        <p className="parti-body mb-4">Sessie: <span className="font-mono parti-small parti-surface-muted px-2 py-1 rounded">{sessionData.session.id.slice(0, 8).toUpperCase()}</span></p>
        <button 
          className="parti-button parti-button-primary touch-target"
          onClick={handleShareQR}
          data-testid="button-share-qr"
        >
          <i className="fas fa-share mr-3"></i>
          Deel QR-code
        </button>
      </div>

      <div className="space-y-6">
        <h2 className="parti-heading-2">Deelnemers ({paidCount}/{totalCount})</h2>
        
        {sessionData.participants.map((participant, index) => (
          <div key={participant.id} className="parti-card !p-6 flex items-center justify-between animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 parti-bg-primary rounded-full flex items-center justify-center parti-shadow-md">
                <span className="text-white font-bold text-lg">
                  {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="parti-body font-semibold text-lg">
                  {participant.name}
                  {participant.isMainBooker && <span className="parti-small ml-2">• Hoofdboeker</span>}
                </p>
                <p className="parti-body mt-1">
                  € {participant.expectedAmount || (parseFloat(sessionData.session.totalAmount) / sessionData.participants.length).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {participant.hasPaid ? (
                <>
                  <div className="w-3 h-3 parti-bg-accent rounded-full"></div>
                  <span className="parti-body font-semibold parti-text-accent">Betaald</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="parti-body font-semibold text-yellow-600">Wachtend</span>
                  <button
                    className="ml-3 parti-button parti-button-primary parti-small px-4 py-2"
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
      </div>

      <div className="parti-card-elevated p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="parti-heading-3">Betalingsvoortgang</h3>
          <span className="parti-body font-semibold">
            € {sessionData.participants.reduce((sum, p) => sum + parseFloat(p.paidAmount || '0'), 0).toFixed(2)} / € {sessionData.session.totalAmount}
          </span>
        </div>
        <div className="w-full parti-surface-muted rounded-full h-3 mb-4">
          <div 
            className="parti-bg-primary h-3 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${calculateProgress()}%` }}
            data-testid="progress-bar"
          ></div>
        </div>
        <p className="parti-body text-center">{paidCount} van {totalCount} personen hebben betaald</p>
      </div>

      
      </div>
    </div>
  );
}
