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
      <ProgressBar currentStep={currentStep} totalSteps={3} />
      
      {currentStep === 1 && (
        <div className="flex-1 px-6 py-8 space-y-8 animate-fade-in">
          {loadBillMutation.isPending && (
            <div className="text-center space-y-6 py-16">
              <div className="w-20 h-20 parti-gradient rounded-full flex items-center justify-center mx-auto parti-shadow-lg">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Rekening ophalen...</h2>
                <p className="text-base text-muted-foreground">Een moment geduld</p>
              </div>
            </div>
          )}
          
          {billData && dataLoaded && (
            <>
              <div className="text-center space-y-6 mb-8 animate-slide-up">
                <div className="w-20 h-20 parti-gradient rounded-full flex items-center justify-center mx-auto parti-shadow-lg">
                  <i className="fas fa-check text-3xl text-white"></i>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-3">Rekening gevonden!</h1>
                  <p className="text-lg text-muted-foreground">Restaurant De Blauwe Kater, Tafel 12</p>
                </div>
              </div>
              
              <BillDisplay 
                billData={billData}
                expanded={billExpanded}
                onToggleExpand={() => setBillExpanded(!billExpanded)}
              />
              
              <div className="space-y-4 mt-auto animate-slide-up">
                <button 
                  className="w-full parti-button parti-button-primary touch-target"
                  onClick={() => handleModeSelect('equal')}
                  data-testid="button-split-bill"
                >
                  Split the Bill
                </button>
                
                <button 
                  className="w-full parti-button parti-button-secondary touch-target"
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
