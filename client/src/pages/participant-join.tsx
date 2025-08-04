import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { simulateBankingFlow } from "@/lib/pdf-utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { MdCallSplit, MdError } from "react-icons/md";
import { BiSelectMultiple } from "react-icons/bi";

interface SessionData {
  session: {
    id: string;
    restaurantName: string;
    tableNumber: string;
    splitMode: string;
    totalAmount: string;
    participantCount: number;
    isActive: boolean;
    linkedIban?: string;
    accountHolderName?: string;
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

export default function ParticipantJoin() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/join/:sessionId");
  const { toast } = useToast();
  
  const [participantName, setParticipantName] = useState("");
  const [selectedItems, setSelectedItems] = useState<{[key: string]: number}>({});
  const [processingPayment, setProcessingPayment] = useState(false);

  const sessionQuery = useQuery({
    queryKey: ['/api/sessions', params?.sessionId],
    enabled: !!params?.sessionId,
  });

  // WebSocket for real-time updates
  const { connected } = useWebSocket(params?.sessionId || '', (message) => {
    if (message.type === 'items-claimed' || message.type === 'participant-joined' || message.type === 'participant-payment-completed') {
      // Refresh session data when items are claimed by others or payments are made
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', params?.sessionId] });
      
      if (message.type === 'items-claimed') {
        const sessionData = sessionQuery.data as SessionData;
        const participant = sessionData?.participants?.find((p: any) => p.id === message.participantId);
        if (participant && participant.name !== participantName) {
          toast({
            title: "Items geclaimd",
            description: `${participant.name} heeft items geselecteerd`,
            duration: 3000,
          });
        }
      }
      
      if (message.type === 'participant-payment-completed') {
        const sessionData = sessionQuery.data as SessionData;
        const participant = sessionData?.participants?.find((p: any) => p.id === message.participantId);
        if (participant && participant.name !== participantName) {
          toast({
            title: "Betaling voltooid",
            description: `${participant.name} heeft betaald`,
            duration: 3000,
          });
        }
      }
    }
  });

  const joinMutation = useMutation({
    mutationFn: async (data: { name: string; expectedAmount?: string }) => {
      const res = await apiRequest('POST', `/api/sessions/${params?.sessionId}/join`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', params?.sessionId] });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon niet deelnemen aan sessie. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  const claimItemsMutation = useMutation({
    mutationFn: async (data: { participantId: string; itemClaims: Array<{ billItemId: string; quantity: number }> }) => {
      const res = await apiRequest('POST', `/api/sessions/${params?.sessionId}/claim-items`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', params?.sessionId] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest('POST', `/api/sessions/${params?.sessionId}/pay`, {
        participantId: currentParticipant?.id,
        amount
      });
      return res.json();
    },
    onSuccess: () => {
      setLocation(`/payment-success/${params?.sessionId}`);
    },
  });

  if (!match || !params?.sessionId) {
    console.log('Route match:', match, 'Params:', params);
    return (
      <div className="monarch-container flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <MdError className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ongeldige link</h1>
          <p className="text-gray-600 mb-4">Route: {window.location.pathname}</p>
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
          <MdError className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sessie niet gevonden</h1>
          <Button onClick={() => setLocation('/')}>
            Terug naar home
          </Button>
        </div>
      </div>
    );
  }

  const sessionData = sessionQuery.data as SessionData;
  const mainBooker = sessionData.participants.find(p => p.isMainBooker);
  const currentParticipant = sessionData.participants.find(p => p.name === participantName);
  const isSplitMode = sessionData.session.splitMode === 'equal';
  const isPayYourPartMode = sessionData.session.splitMode === 'items';

  // Calculate available items (not fully claimed)
  const availableItems = sessionData.billItems.map(item => {
    const totalClaimed = sessionData.itemClaims
      .filter(claim => claim.billItemId === item.id)
      .reduce((sum, claim) => sum + claim.quantity, 0);
    return {
      ...item,
      availableQuantity: item.quantity - totalClaimed
    };
  }).filter(item => item.availableQuantity > 0);

  const handleJoinSession = () => {
    if (!participantName.trim()) {
      toast({
        title: "Fout",
        description: "Voer je naam in om deel te nemen.",
        variant: "destructive",
      });
      return;
    }

    if (isSplitMode) {
      const expectedAmount = (parseFloat(sessionData.session.totalAmount) / sessionData.session.participantCount).toFixed(2);
      joinMutation.mutate({
        name: participantName,
        expectedAmount
      });
    } else {
      joinMutation.mutate({ name: participantName });
    }
  };

  const handleItemSelection = (itemId: string, quantity: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const handleClaimItems = () => {
    if (!currentParticipant) return;
    
    const itemClaims = Object.entries(selectedItems)
      .filter(([_, quantity]) => quantity > 0)
      .map(([billItemId, quantity]) => ({ billItemId, quantity }));

    if (itemClaims.length === 0) {
      toast({
        title: "Selecteer items",
        description: "Kies minimaal één item om door te gaan.",
        variant: "destructive",
      });
      return;
    }

    claimItemsMutation.mutate({
      participantId: currentParticipant.id,
      itemClaims
    });
  };

  const handlePayment = () => {
    if (!currentParticipant) return;
    
    const amount = parseFloat(currentParticipant.expectedAmount || '0');
    setProcessingPayment(true);
    
    simulateBankingFlow(
      amount.toString(),
      sessionData.session.id,
      () => {
        setProcessingPayment(false);
        paymentMutation.mutate(amount);
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
  };

  const calculateTotalSelected = () => {
    return Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
      const item = sessionData.billItems.find(i => i.id === itemId);
      return total + (item ? parseFloat(item.price) * quantity : 0);
    }, 0);
  };

  return (
    <div className="monarch-container flex flex-col min-h-screen">
      <div className="flex-1 px-4 py-6 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4 animate-slide-up">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-[#f97315]">
            {isSplitMode ? <MdCallSplit className="text-white text-2xl" /> : <BiSelectMultiple className="text-white text-2xl" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Deelnemen aan sessie</h1>
            <p className="text-gray-600 mb-2">
              {sessionData.session.restaurantName} • Tafel {sessionData.session.tableNumber}
            </p>
            <p className="text-sm text-gray-500">
              {isSplitMode ? 'Split the Bill' : 'Pay your Part'} • Hoofdboeker: {mainBooker?.name}
            </p>
          </div>
        </div>

        {/* Join Form */}
        {!currentParticipant && (
          <div className="monarch-card animate-slide-up" style={{animationDelay: '0.1s'}}>
            <h3 className="font-semibold text-gray-900 mb-3">Je gegevens</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Je naam
                </label>
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Voer je naam in"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-monarch-primary focus:border-transparent"
                  data-testid="input-participant-name"
                />
              </div>
              
              {isSplitMode && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-800 font-medium">Je aandeel:</span>
                    <span className="text-orange-900 font-bold text-lg">
                      € {(parseFloat(sessionData.session.totalAmount) / sessionData.session.participantCount).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-orange-700 mt-2">
                    Totaal: € {sessionData.session.totalAmount} ÷ {sessionData.session.participantCount} personen
                  </p>
                </div>
              )}

              <Button
                onClick={handleJoinSession}
                disabled={joinMutation.isPending || !participantName.trim()}
                className="w-full monarch-btn monarch-btn-primary"
                data-testid="button-join-session"
              >
                {joinMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Deelnemen...
                  </>
                ) : (
                  'Deelnemen aan sessie'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Item Selection (Pay Your Part) */}
        {currentParticipant && isPayYourPartMode && parseFloat(currentParticipant.expectedAmount || '0') === 0 && (
          <div className="monarch-card animate-slide-up" style={{animationDelay: '0.2s'}}>
            <h3 className="font-semibold text-gray-900 mb-3">Selecteer je items</h3>
            <div className="space-y-3">
              {availableItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">
                      € {parseFloat(item.price).toFixed(2)} • {item.availableQuantity} beschikbaar
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleItemSelection(item.id, Math.max(0, (selectedItems[item.id] || 0) - 1))}
                      disabled={!selectedItems[item.id] || selectedItems[item.id] === 0}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center disabled:opacity-50"
                    >
                      <i className="fas fa-minus text-xs"></i>
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {selectedItems[item.id] || 0}
                    </span>
                    <button
                      onClick={() => handleItemSelection(item.id, Math.min(item.availableQuantity, (selectedItems[item.id] || 0) + 1))}
                      disabled={selectedItems[item.id] >= item.availableQuantity}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center disabled:opacity-50"
                    >
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {Object.keys(selectedItems).length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-green-800 font-medium">Totaal geselecteerd:</span>
                  <span className="text-green-900 font-bold text-lg">
                    € {calculateTotalSelected().toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleClaimItems}
              disabled={claimItemsMutation.isPending || Object.keys(selectedItems).length === 0}
              className="w-full monarch-btn monarch-btn-primary mt-4"
              data-testid="button-claim-items"
            >
              {claimItemsMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Items selecteren...
                </>
              ) : (
                'Bevestig selectie'
              )}
            </Button>
          </div>
        )}

        {/* Payment Section */}
        {currentParticipant && parseFloat(currentParticipant.expectedAmount || '0') > 0 && (
          <div className="monarch-card animate-slide-up" style={{animationDelay: '0.3s'}}>
            <h3 className="font-semibold text-gray-900 mb-3">Betaling</h3>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-800 font-medium">Te betalen bedrag:</span>
                  <span className="text-green-900 font-bold text-xl">
                    € {parseFloat(currentParticipant.expectedAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {sessionData.session.linkedIban && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Betaling naar:</h4>
                  <p className="text-blue-700">{sessionData.session.accountHolderName}</p>
                  <p className="text-sm text-blue-600 font-mono">
                    {sessionData.session.linkedIban.substring(0, 4)}****{sessionData.session.linkedIban.substring(-4)}
                  </p>
                </div>
              )}

              <Button
                onClick={handlePayment}
                disabled={paymentMutation.isPending || processingPayment}
                className="w-full monarch-btn monarch-btn-primary"
                data-testid="button-pay-amount"
              >
                {paymentMutation.isPending || processingPayment ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    {processingPayment ? 'Banking app...' : 'Betaling verwerken...'}
                  </>
                ) : (
                  <>
                    <i className="fas fa-credit-card mr-2"></i>
                    Betaal € {parseFloat(currentParticipant.expectedAmount).toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}