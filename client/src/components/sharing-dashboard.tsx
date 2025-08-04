import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { generateQRCode } from "@/lib/qr-utils";
import { simulateBankingFlow } from "@/lib/pdf-utils";
import { MdError } from "react-icons/md";

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
  
  // Sync local state with props when data changes
  useEffect(() => {
    setSessionData(initialData);
    
    // Check if session is completed - only for 'equal' split mode
    // For 'items' mode, main booker should stay on dashboard regardless of session status
    if (initialData.session && !initialData.session.isActive && initialData.session.splitMode === 'equal') {
      setSessionCompleted(true);
    }
  }, [initialData]);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { connected } = useWebSocket(sessionData.session.id, (message) => {
    // Force immediate refresh for all real-time updates
    const forceRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionData.session.id] });
      queryClient.refetchQueries({ queryKey: ['/api/sessions', sessionData.session.id] });
    };

    if (message.type === 'participant-joined') {
      forceRefresh();
      toast({
        title: "Nieuwe deelnemer! 👋",
        description: `${message.participant.name} heeft zich aangesloten`,
        duration: 4000,
      });
    } else if (message.type === 'items-claimed') {
      forceRefresh();
      const participant = sessionData.participants.find(p => p.id === message.participantId);
      if (participant) {
        toast({
          title: "Items geselecteerd 🍽️",
          description: `${participant.name} heeft items gekozen (€${message.expectedAmount.toFixed(2)})`,
          duration: 4000,
        });
      }
    } else if (message.type === 'participant-payment-completed' || message.type === 'payment-completed' || message.type === 'session-completed') {
      forceRefresh();
      
      if (message.type === 'session-completed') {
        // Only show completion for 'equal' split mode
        // For 'items' mode, main booker should stay on dashboard to manually pay full bill
        if (sessionData.session.splitMode === 'equal') {
          toast({
            title: "Sessie voltooid! 🎉",
            description: "Alle betalingen zijn ontvangen",
            duration: 5000,
          });
          setSessionCompleted(true);
        } else {
          // For 'items' mode, just show a notification but don't complete the session
          toast({
            title: "Alle deelnemers hebben betaald! 💰",
            description: "Je kunt nu de volledige rekening betalen",
            duration: 5000,
          });
        }
      } else {
        const paidParticipant = message.participant || sessionData.participants.find(p => p.id === message.participantId);
        if (paidParticipant) {
          toast({
            title: "Betaling ontvangen! 💰",
            description: `${paidParticipant.name} heeft €${parseFloat(message.payment?.amount || message.amount || '0').toFixed(2)} betaald`,
            duration: 5000,
          });
        }
      }
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

  const [processingPayment, setProcessingPayment] = useState(false);

  const fullPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/sessions/${sessionData.session.id}/initiate-payment`, {});
      return res.json();
    },
    onSuccess: (data) => {
      // Start banking deeplink flow
      setProcessingPayment(true);
      simulateBankingFlow(
        sessionData.session.totalAmount,
        sessionData.session.id,
        () => {
          setProcessingPayment(false);
          // Success handled by redirect to payment-success page
        },
        (error) => {
          setProcessingPayment(false);
          toast({
            title: "Betalingsfout",
            description: error,
            variant: "destructive",
          });
        }
      );
    },
    onError: () => {
      toast({
        title: "Betalingsfout",
        description: "Kon betaling niet starten. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Generate QR code for participants to join the session
    const joinUrl = `${window.location.origin}/join/${sessionData.session.id}`;
    generateQRCode(joinUrl).then(setQrCodeUrl);
  }, [sessionData.session.id]);

  const calculateProgress = () => {
    // For split mode, calculate expected total based on actual participants
    const totalAmount = parseFloat(sessionData.session.totalAmount);
    const expectedTotal = sessionData.session.splitMode === 'equal' 
      ? (totalAmount / actualParticipants) * actualParticipants
      : totalAmount;
    
    const totalPaid = sessionData.participants.reduce((sum, p) => {
      if (p.hasPaid) {
        // Use the actual expected amount for this participant
        const participantExpected = parseFloat(p.expectedAmount || '0');
        return sum + participantExpected;
      }
      return sum;
    }, 0);
    return expectedTotal > 0 ? (totalPaid / expectedTotal) * 100 : 0;
  };

  const paidCount = sessionData.participants.filter(p => p.hasPaid).length;
  const totalCount = sessionData.session.participantCount || sessionData.participants.length;
  const actualParticipants = sessionData.participants.length;
  const waitingForParticipants = totalCount - actualParticipants;

  const handleMockPayment = (participant: any) => {
    // Use the participant's actual expected amount
    const amount = parseFloat(participant.expectedAmount || '0');
    if (amount > 0) {
      paymentMutation.mutate({
        participantId: participant.id,
        amount
      });
    }
  };

  const calculateOutstandingDetails = () => {
    const totalAmount = parseFloat(sessionData.session.totalAmount);
    
    if (sessionData.session.splitMode === 'items') {
      // For items mode, calculate based on unclaimed items
      const totalItemsValue = sessionData.billItems.reduce((sum, item) => {
        const claimedQuantity = sessionData.itemClaims
          .filter(claim => claim.billItemId === item.id)
          .reduce((claimSum, claim) => claimSum + claim.quantity, 0);
        const unclaimedQuantity = item.quantity - claimedQuantity;
        return sum + (parseFloat(item.price) * unclaimedQuantity);
      }, 0);
      
      const unpaidParticipants = sessionData.participants.filter(p => !p.hasPaid);
      
      return {
        outstandingAmount: totalItemsValue,
        unpaidParticipants,
        hasOutstanding: totalItemsValue > 0.01 // Small threshold for floating point precision
      };
    } else {
      // For equal mode, calculate based on participant expected amounts
      const totalPaid = sessionData.participants.reduce((sum, p) => {
        if (p.hasPaid) {
          const participantExpected = parseFloat(p.expectedAmount || '0');
          return sum + participantExpected;
        }
        return sum;
      }, 0);
      
      const outstandingAmount = totalAmount - totalPaid;
      const unpaidParticipants = sessionData.participants.filter(p => !p.hasPaid);
      
      return {
        outstandingAmount,
        unpaidParticipants,
        hasOutstanding: outstandingAmount > 0.01
      };
    }
  };

  const calculateUnpaidItems = () => {
    if (sessionData.session.splitMode !== 'items') return [];
    
    return sessionData.billItems.map(item => {
      const totalClaimed = sessionData.itemClaims
        .filter(claim => claim.billItemId === item.id)
        .reduce((sum, claim) => sum + claim.quantity, 0);
      
      const unclaimed = item.quantity - totalClaimed;
      
      return {
        ...item,
        unclaimed,
        hasUnclaimed: unclaimed > 0
      };
    }).filter(item => item.hasUnclaimed);
  };

  const handlePayFullBill = () => {
    const outstandingDetails = calculateOutstandingDetails();
    
    // If there are outstanding amounts, show confirmation modal
    if (outstandingDetails.hasOutstanding) {
      setShowPaymentConfirmModal(true);
    } else {
      // If everyone has paid, proceed directly
      fullPaymentMutation.mutate();
    }
  };

  const confirmFullPayment = () => {
    setShowPaymentConfirmModal(false);
    fullPaymentMutation.mutate();
  };

  const isMainBooker = sessionData.participants.some(p => p.isMainBooker);
  const canPayFullBill = true; // Allow anyone to pay the full bill
  const outstandingDetails = calculateOutstandingDetails();

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
        </div>
      </div>
    );
  }

  return (
    <div className="monarch-container bg-background flex flex-col">
      <div className="flex-1 px-3 py-4 space-y-4">
      
      
      <div className="monarch-widget text-center animate-slide-up">
        <h1 className="monarch-title mb-2">{sessionData.session.splitMode === 'equal' ? 'Split the Bill' : 'Pay your Part'}</h1>
        <p className="monarch-body mb-3">Sessie: <span className="font-mono monarch-caption bg-muted px-2 py-0.5 rounded-full text-xs">{sessionData.session.id.slice(0, 8).toUpperCase()}</span></p>
        <p className="monarch-body mb-4">Laat anderen deze QR-code scannen om mee te betalen</p>
        <button 
          className="monarch-btn monarch-btn-primary touch-target"
          onClick={() => setShowQRModal(true)}
          data-testid="button-share-qr"
        >
          Deel QR-code
        </button>
      </div>

      <div className="space-y-3">
        {/* Payment Progress Bar */}
        {(() => {
          const totalAmount = parseFloat(sessionData.session.totalAmount);
          const totalPaid = sessionData.participants.reduce((sum, p) => {
            if (p.hasPaid) {
              // Use the participant's actual expected amount
              const participantExpected = parseFloat(p.expectedAmount || '0');
              return sum + participantExpected;
            }
            return sum;
          }, 0);
          const progressPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
          
          return (
            <div className="monarch-card mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-700">Betalingsvoortgang</span>
                <span className="text-xs font-medium text-gray-900">
                  Deelnemers ({actualParticipants}/{totalCount})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-green-400 h-2 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  data-testid="payment-progress-bar"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{Math.round(progressPercentage)}% betaald</span>
                <span>Nog € {calculateOutstandingDetails().outstandingAmount.toFixed(2)} te gaan</span>
              </div>
            </div>
          );
        })()}
        
        
        {sessionData.participants.map((participant, index) => (
          <div key={participant.id} className={`monarch-card flex items-center justify-between animate-slide-up ${participant.isMainBooker ? 'bg-orange-50/50' : ''}`} style={{animationDelay: `${index * 0.02}s`}}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${participant.isMainBooker ? 'bg-monarch-primary' : ''}`} style={participant.isMainBooker ? {} : { backgroundColor: '#f9731691' }}>
                <span className="text-white font-semibold text-xs">
                  {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {participant.name}
                  {participant.isMainBooker && <span className="monarch-caption ml-1 text-muted-foreground text-xs">• Hoofdboeker</span>}
                </p>
                <p className="text-sm text-gray-900 leading-tight font-semibold tabular-nums">
                  € {parseFloat(participant.expectedAmount || '0').toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {participant.hasPaid ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-900 leading-tight font-semibold text-green-600">Betaald</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="monarch-body font-medium text-yellow-600 text-xs">Wachtend</span>
                </>
              )}
            </div>
          </div>
        ))}
        
        
        
        {/* Show waiting slots for remaining participants */}
        {waitingForParticipants > 0 && Array.from({ length: waitingForParticipants }, (_, index) => (
          <div key={`waiting-${index}`} className="monarch-card flex items-center justify-between animate-slide-up opacity-50" style={{animationDelay: `${(sessionData.participants.length + index) * 0.1}s`}}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-gray-500 text-sm"></i>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">
                  Wachtend op deelnemer...
                </p>
                <p className="text-sm text-gray-500 leading-tight font-semibold tabular-nums">
                  € {sessionData.session.splitMode === 'equal' 
                    ? (parseFloat(sessionData.session.totalAmount) / actualParticipants).toFixed(2)
                    : '0.00'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <span className="monarch-body font-medium text-gray-500 text-xs">Wachtend</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Bottom Payment Button */}
      {canPayFullBill && (
        <div className="px-4 pb-4 mt-4">
          <button
            className="w-full monarch-btn monarch-btn-primary flex items-center justify-center space-x-2"
            onClick={handlePayFullBill}
            disabled={fullPaymentMutation.isPending || processingPayment}
            data-testid="button-pay-full-bill"
          >
            {fullPaymentMutation.isPending || processingPayment ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>{processingPayment ? 'Banking app openen...' : 'Betaling voorbereiden...'}</span>
              </>
            ) : (
              <>
                <i className="fas fa-credit-card"></i>
                <span>Betaal volledige rekening</span>
              </>
            )}
          </button>
        </div>
      )}
      </div>
      
      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full text-center animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-gray-900">Scan QR-code</h3>
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
                className="w-48 h-48 mx-auto mb-4 rounded-xl border"
                data-testid="qr-code-modal"
              />
            ) : (
              <div className="w-48 h-48 bg-muted rounded-xl mx-auto mb-4 flex items-center justify-center">
                <div className="monarch-body text-xs">QR-code laden...</div>
              </div>
            )}
            <p className="monarch-body mb-4 text-xs">Laat vrienden deze code scannen om mee te betalen</p>
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
      
      {/* Payment Confirmation Modal */}
      {showPaymentConfirmModal && (() => {
        const outstandingDetails = calculateOutstandingDetails();
        const unpaidItems = calculateUnpaidItems();
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-xl p-4 max-w-sm w-full animate-slide-up">
              <div className="flex items-start space-x-2 mb-3">
                <MdError className="w-24 h-24 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Bevestig volledige betaling</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    {sessionData.session.splitMode === 'items' 
                      ? 'Er zijn nog items die niet zijn geselecteerd. Wil je toch de volledige rekening betalen?'
                      : 'Niet alle deelnemers hebben hun deel betaald. Wil je toch de volledige rekening betalen?'
                    }
                  </p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <h4 className="text-xs font-medium text-red-800 mb-1">Openstaand bedrag</h4>
                <p className="text-base font-bold text-red-900 mb-2">
                  € {outstandingDetails.outstandingAmount.toFixed(2)}
                </p>
                
                {sessionData.session.splitMode === 'items' && unpaidItems.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-red-700 mb-2">Niet geselecteerde items:</p>
                    <ul className="text-xs text-red-700 space-y-1">
                      {unpaidItems.map(item => (
                        <li key={item.id} className="flex justify-between items-center">
                          <span>• {item.name}</span>
                          <span className="font-semibold">
                            {item.unclaimed}x € {parseFloat(item.price).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  className="flex-1 monarch-btn monarch-btn-secondary text-xs"
                  onClick={() => setShowPaymentConfirmModal(false)}
                  data-testid="button-cancel-payment"
                >
                  Annuleren
                </button>
                <button
                  className="flex-1 monarch-btn monarch-btn-primary text-xs"
                  onClick={confirmFullPayment}
                  disabled={fullPaymentMutation.isPending || processingPayment}
                  data-testid="button-confirm-payment"
                >
                  {fullPaymentMutation.isPending || processingPayment ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-1 text-xs"></i>
                      {processingPayment ? 'Banking app...' : 'Voorbereiden...'}
                    </>
                  ) : (
                    'Ja, betaal alles'
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
