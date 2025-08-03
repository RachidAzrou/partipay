import { useState } from "react";
import React from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProgressBar from "@/components/progress-bar";
import BillDisplay from "@/components/bill-display";
import ModeSetup from "@/components/mode-setup";
import { Button } from "@/components/ui/button";
import type { BillItem } from "@shared/schema";

interface BillData {
  items: BillItem[];
  totalAmount: string;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [billExpanded, setBillExpanded] = useState(false);
  const [splitMode, setSplitMode] = useState<'equal' | 'items' | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const loadBillMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/scan-qr', {
        tableNumber: "7",
        restaurantName: "De Gouden Leeuw"
      });
      return res.json();
    },
    onSuccess: (data: BillData) => {
      setBillData(data);
      setDataLoaded(true);
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon rekening niet ophalen. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      const res = await apiRequest('POST', '/api/sessions', sessionData);
      return res.json();
    },
    onSuccess: (session) => {
      setLocation(`/session/${session.id}`);
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon sessie niet aanmaken. Probeer opnieuw.",
        variant: "destructive",
      });
    },
  });

  // Auto-load bill data when component mounts (simulating QR scan at table)
  React.useEffect(() => {
    if (!dataLoaded && !loadBillMutation.isPending) {
      loadBillMutation.mutate();
    }
  }, [dataLoaded, loadBillMutation]);

  const handleModeSelect = (mode: 'equal' | 'items') => {
    setSplitMode(mode);
    setCurrentStep(2);
  };

  const handleContinueToSharing = (userData: { name: string; bankAccount?: string; participantCount?: number; selectedItems?: any[] }) => {
    if (!billData || !splitMode) return;

    const sessionData = {
      restaurantName: "De Gouden Leeuw",
      tableNumber: "7",
      splitMode,
      totalAmount: billData.totalAmount,
      isActive: true,
    };

    createSessionMutation.mutate({
      ...sessionData,
      userData,
      billItems: billData.items
    });
  };

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen shadow-xl relative overflow-hidden">
      <ProgressBar currentStep={currentStep} totalSteps={3} />
      
      {currentStep === 1 && (
        <div className="px-4 py-6 space-y-6">
          {loadBillMutation.isPending && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-[hsl(24,_95%,_53%)] to-[hsl(38,_92%,_50%)] rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Rekening ophalen...</h2>
                <p className="text-sm text-gray-600">Een moment geduld</p>
              </div>
            </div>
          )}
          
          {billData && dataLoaded && (
            <>
              <div className="text-center space-y-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-[hsl(24,_95%,_53%)] to-[hsl(38,_92%,_50%)] rounded-full flex items-center justify-center mx-auto">
                  <i className="fas fa-check text-2xl text-white"></i>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Rekening gevonden!</h2>
                  <p className="text-sm text-gray-600">Restaurant De Gouden Leeuw, Tafel 7</p>
                </div>
              </div>
              
              <BillDisplay 
                billData={billData}
                expanded={billExpanded}
                onToggleExpand={() => setBillExpanded(!billExpanded)}
              />
              
              <div className="space-y-3">
                <Button 
                  className="w-full bg-gradient-to-r from-[hsl(24,_95%,_53%)] to-[hsl(38,_92%,_50%)] text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  onClick={() => handleModeSelect('equal')}
                  data-testid="button-split-bill"
                >
                  <i className="fas fa-users mr-3"></i>
                  Split the Bill
                  <p className="text-xs text-orange-100 mt-1">Verdeel gelijk over alle deelnemers</p>
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full bg-white border-2 border-[hsl(24,_95%,_53%)] text-[hsl(24,_95%,_53%)] font-semibold py-4 px-6 rounded-xl hover:bg-orange-50 transition-all"
                  onClick={() => handleModeSelect('items')}
                  data-testid="button-pay-part"
                >
                  <i className="fas fa-receipt mr-3"></i>
                  Pay Your Part
                  <p className="text-xs text-[hsl(24,_95%,_53%)] opacity-75 mt-1">Kies je eigen items van de rekening</p>
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {currentStep === 2 && billData && splitMode && (
        <ModeSetup
          splitMode={splitMode}
          billData={billData}
          onBack={() => setCurrentStep(1)}
          onContinue={handleContinueToSharing}
        />
      )}
    </div>
  );
}
