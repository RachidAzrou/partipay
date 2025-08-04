import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
  const [showConfetti, setShowConfetti] = useState(true);

  const sessionQuery = useQuery({
    queryKey: ['/api/sessions', params?.sessionId],
    enabled: !!params?.sessionId,
  });

  // Hide confetti after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

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
    <div className="monarch-container flex flex-col min-h-screen relative">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20 + 10}px`,
                animation: `confetti-fall ${3 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full opacity-80"
                style={{
                  backgroundColor: [
                    '#F97316', // Orange
                    '#FB923C', // Light orange
                    '#FBBF24', // Yellow
                    '#34D399', // Green
                    '#60A5FA', // Blue
                    '#A78BFA', // Purple
                    '#F472B6', // Pink
                  ][Math.floor(Math.random() * 7)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}
      
      <div className="flex-1 px-4 py-6 space-y-6 flex flex-col items-center justify-center text-center">
        
        {/* Success Header */}
        <div className="space-y-4 animate-slide-up">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto bg-green-500">
            <i className="fas fa-check text-white text-4xl"></i>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Betaling succesvol!</h1>
            <p className="text-gray-600 mb-6 text-lg">
              Je betaling voor {sessionData.session.restaurantName} is verwerkt
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-sm mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-green-800 font-medium text-lg">Totaal betaald:</span>
                <span className="text-green-900 font-bold text-2xl">
                  € {sessionData.session.totalAmount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Session Summary */}
        <div className="monarch-card animate-slide-up max-w-sm mx-auto" style={{animationDelay: '0.4s'}}>
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

      {/* Bottom Action */}
      <div className="px-4 pb-6">
        <Button
          onClick={() => setLocation('/')}
          className="w-full monarch-btn monarch-btn-primary text-lg py-4"
          data-testid="button-new-session"
        >
          Nieuwe rekening splitsen
        </Button>
      </div>
      
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}