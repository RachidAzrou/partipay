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
        tableNumber: "12",
        restaurantName: "De Blauwe Kater"
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
      restaurantName: "De Blauwe Kater",
      tableNumber: "12",
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
    <div className="parti-container bg-background flex flex-col">
      <ProgressBar 
        currentStep={currentStep} 
        totalSteps={3} 
        onBack={currentStep > 1 ? () => setCurrentStep(currentStep - 1) : undefined}
      />
      
      {currentStep === 1 && (
        <div className="flex-1 px-6 py-8 space-y-8 animate-fade-in">
          {loadBillMutation.isPending && (
            <div className="text-center space-y-6 py-16">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 border-3 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h2 className="parti-heading-2">Rekening ophalen...</h2>
                <p className="parti-body">Een moment geduld</p>
              </div>
            </div>
          )}
          
          {billData && dataLoaded && (
            <>
              <div className="text-center space-y-6 mb-8 animate-slide-up">
                <div className="w-16 h-16 parti-bg-accent rounded-full flex items-center justify-center mx-auto">
                  <i className="fas fa-check text-2xl text-white"></i>
                </div>
                <div>
                  <h1 className="parti-heading-1">Rekening gevonden!</h1>
                  <p className="parti-body">Restaurant De Blauwe Kater, Tafel 12</p>
                </div>
              </div>
              
              <BillDisplay 
                billData={billData}
                expanded={billExpanded}
                onToggleExpand={() => setBillExpanded(!billExpanded)}
              />
              
              <div className="space-y-3 mt-auto animate-slide-up">
                <button 
                  className="w-full parti-button parti-button-primary touch-target py-4"
                  onClick={() => handleModeSelect('equal')}
                  data-testid="button-split-bill"
                >
                  Split the Bill
                </button>
                
                <button 
                  className="w-full parti-button parti-button-secondary touch-target py-4"
                  onClick={() => handleModeSelect('items')}
                  data-testid="button-pay-part"
                >
                  Pay Your Part
                </button>
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
