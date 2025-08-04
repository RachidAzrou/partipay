import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { IoReceiptOutline } from "react-icons/io5";
import { MdCallSplit } from "react-icons/md";
import { BiSelectMultiple } from "react-icons/bi";
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
      // Prefetch session data for instant loading
      queryClient.prefetchQuery({
        queryKey: ['/api/sessions', session.id],
        staleTime: 5 * 60 * 1000,
      });
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
  useEffect(() => {
    if (!dataLoaded && !loadBillMutation.isPending) {
      // Simulate QR scan with mock restaurant data
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
    <div className="monarch-container flex flex-col">
      <ProgressBar 
        currentStep={currentStep} 
        totalSteps={3} 
        onBack={currentStep > 1 ? () => setCurrentStep(currentStep - 1) : undefined}
      />
      {currentStep === 1 && (
        <div className="flex-1 flex items-center justify-center min-h-0 px-3 animate-fade-in">
          <div className="w-full max-w-md space-y-6 py-4">
          {loadBillMutation.isPending && (
            <div className="text-center space-y-3 py-6">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>
                <h2 className="monarch-title text-base">Rekening ophalen...</h2>
              </div>
            </div>
          )}
          
          {billData && dataLoaded && (
            <div className="text-center space-y-4 animate-slide-up px-2">
              <BillDisplay 
                billData={billData}
                expanded={billExpanded}
                onToggleExpand={() => setBillExpanded(!billExpanded)}
              />
              
              <div className="space-y-3 mt-auto">
                <button 
                  className="w-full monarch-btn monarch-btn-primary touch-target flex items-center justify-center space-x-2"
                  onClick={() => handleModeSelect('equal')}
                  data-testid="button-split-bill"
                >
                  <MdCallSplit className="text-lg" />
                  <span className="text-sm">Split the Bill</span>
                </button>
                
                <button 
                  className="w-full monarch-btn monarch-btn-secondary touch-target flex items-center justify-center space-x-2"
                  onClick={() => handleModeSelect('items')}
                  data-testid="button-pay-part"
                >
                  <BiSelectMultiple className="text-lg" />
                  <span className="text-sm">Pay your Part</span>
                </button>
              </div>
            </div>
          )}
          </div>
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
