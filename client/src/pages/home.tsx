import { useState } from "react";
import React from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { IoReceiptOutline } from "react-icons/io5";
import { MdCallSplit } from "react-icons/md";
import { TbSitemapFilled } from "react-icons/tb";
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
    <div className="monarch-container flex flex-col">
      <ProgressBar 
        currentStep={currentStep} 
        totalSteps={3} 
        onBack={currentStep > 1 ? () => setCurrentStep(currentStep - 1) : undefined}
      />
      {currentStep === 1 && (
        <div className="flex-1 px-6 py-8 space-y-8 animate-fade-in">
          {loadBillMutation.isPending && (
            <div className="text-center space-y-8 py-20">
              <div className="w-12 h-12 border-3 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>
                <h2 className="monarch-title">Rekening ophalen...</h2>
                <p className="monarch-body">Een moment geduld</p>
              </div>
            </div>
          )}
          
          {billData && dataLoaded && (
            <>
              <div className="text-center space-y-8 mb-12 animate-slide-up">
                <div className="w-20 h-20 bg-monarch-green rounded-full flex items-center justify-center mx-auto">
                  <IoReceiptOutline className="text-3xl text-white" />
                </div>
                <div>
                  <h1 className="monarch-title text-2xl">Rekening gevonden!</h1>
                  <p className="monarch-body text-lg">Restaurant De Blauwe Kater, Tafel 12</p>
                </div>
              </div>
              
              <BillDisplay 
                billData={billData}
                expanded={billExpanded}
                onToggleExpand={() => setBillExpanded(!billExpanded)}
              />
              
              <div className="space-y-4 mt-auto animate-slide-up px-4">
                <button 
                  className="w-full monarch-btn monarch-btn-primary py-4 touch-target flex items-center justify-center space-x-2"
                  onClick={() => handleModeSelect('equal')}
                  data-testid="button-split-bill"
                >
                  <MdCallSplit className="text-xl" />
                  <span>Split the Bill</span>
                </button>
                
                <button 
                  className="w-full monarch-btn monarch-btn-secondary py-4 touch-target flex items-center justify-center space-x-2"
                  onClick={() => handleModeSelect('items')}
                  data-testid="button-pay-part"
                >
                  <TbSitemapFilled className="text-xl" />
                  <span>Pay your Part</span>
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
