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
      console.log('Creating session with data:', sessionData);
      try {
        const res = await apiRequest('POST', '/api/sessions', sessionData);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Session creation failed:', res.status, errorText);
          throw new Error(`Session creation failed: ${res.status} ${errorText}`);
        }
        const result = await res.json();
        console.log('Session created successfully:', result);
        return result;
      } catch (error) {
        console.error('Session creation error in mutationFn:', error);
        throw error;
      }
    },
    onSuccess: (session) => {
      console.log('Session mutation success, navigating to:', `/session/${session.id}`);
      
      // Prefetch session data for instant loading
      queryClient.prefetchQuery({
        queryKey: ['/api/sessions', session.id],
        staleTime: 5 * 60 * 1000,
      });
      
      // Force navigation to session page with multiple fallbacks
      setCurrentStep(3);
      
      // Primary navigation attempt
      try {
        setLocation(`/session/${session.id}`);
      } catch (error) {
        console.error('Navigation error, trying fallback:', error);
        // Fallback using window.location
        window.location.href = `/session/${session.id}`;
      }
      
      // Backup navigation after a short delay
      setTimeout(() => {
        if (window.location.pathname !== `/session/${session.id}`) {
          console.log('Fallback navigation triggered');
          window.location.href = `/session/${session.id}`;
        }
      }, 2000);
      
      toast({
        title: "Sessie aangemaakt!",
        description: "Je wordt doorgestuurd naar de betaalpagina.",
      });
    },
    onError: (error) => {
      console.error('Session creation error:', error);
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
      loadBillMutation.mutate();
    }
  }, [dataLoaded, loadBillMutation]);

  const handleModeSelect = (mode: 'equal' | 'items') => {
    setSplitMode(mode);
    setCurrentStep(2);
  };

  const handleContinueToSharing = (userData: { name: string; bankAccount?: string; participantCount?: number; selectedItems?: any[] }) => {
    console.log('handleContinueToSharing called with userData:', userData);
    
    if (!billData || !splitMode) {
      console.error('Cannot continue: billData =', billData, 'splitMode =', splitMode);
      toast({
        title: "Fout",
        description: "Rekening of split mode ontbreekt. Probeer opnieuw.",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting session creation process...');
    console.log('createSessionMutation.isPending:', createSessionMutation.isPending);
    
    const sessionData = {
      restaurantName: "De Blauwe Kater",
      tableNumber: "12",
      splitMode,
      totalAmount: billData.totalAmount,
      isActive: true,
    };

    const fullSessionData = {
      ...sessionData,
      userData,
      billItems: billData.items
    };

    console.log('Calling createSessionMutation with:', fullSessionData);
    createSessionMutation.mutate(fullSessionData);
    console.log('createSessionMutation.mutate called');
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
      
      {currentStep === 3 && createSessionMutation.isPending && (
        <div className="flex-1 flex items-center justify-center min-h-0 px-3 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 parti-bg-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="parti-heading-2">Sessie wordt aangemaakt...</h2>
            <p className="parti-body">Je wordt doorgestuurd naar de betaalpagina.</p>
          </div>
        </div>
      )}
    </div>
  );
}
