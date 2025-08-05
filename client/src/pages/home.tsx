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
  
  // Check URL for step parameter
  const urlParams = new URLSearchParams(window.location.search);
  const stepParam = urlParams.get('step');
  const initialStep = stepParam ? parseInt(stepParam, 10) : 1;
  
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [billExpanded, setBillExpanded] = useState(false);
  const [splitMode, setSplitMode] = useState<'equal' | 'items' | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Auto-load bill data and set defaults when starting at step 2
  useEffect(() => {
    if (initialStep === 2 && !billData && !loadBillMutation.isPending) {
      loadBillMutation.mutate();
      // Set a default split mode so the mode setup component can display
      if (!splitMode) {
        setSplitMode('equal');
      }
    }
  }, [initialStep]);

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
    mutationKey: ['create-session'], // Prevent duplicate calls
    mutationFn: async (sessionData: any) => {
      console.log('Creating session with data:', sessionData);
      console.log('Environment check:', {
        isDev: import.meta.env.DEV,
        baseURL: import.meta.env.BASE_URL,
        currentURL: window.location.href,
        timestamp: new Date().toISOString()
      });
      
      // In production, use direct fetch with aggressive timeout
      if (!import.meta.env.DEV) {
        console.log('🚀 Production mode: using direct fetch with timeout');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('⏰ Request timed out after 30 seconds');
          controller.abort();
        }, 30000);
        
        try {
          const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sessionData),
            credentials: 'include',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Server responded with ${response.status}:`, errorText);
            throw new Error(`Server error: ${response.status} ${errorText}`);
          }
          
          const result = await response.json();
          console.log('✅ Production session created:', result);
          return result;
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('🔥 Production fetch error:', error);
          
          if (error instanceof Error && error.name === 'AbortError') {
            // Try one more time with longer delay for cold starts
            console.log('🔄 Timeout detected, trying one final attempt...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const retryResponse = await fetch('/api/sessions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sessionData),
              credentials: 'include'
            });
            
            if (retryResponse.ok) {
              const result = await retryResponse.json();
              console.log('✅ Retry after timeout succeeded:', result);
              return result;
            }
            
            throw new Error('Server cold start timeout. Probeer over enkele minuten opnieuw.');
          }
          throw error;
        }
      }
      
      // Development mode - use original apiRequest
      try {
        const res = await apiRequest('POST', '/api/sessions', sessionData);
        const result = await res.json();
        console.log('Session created successfully:', result);
        return result;
      } catch (error) {
        console.error('Session creation error in mutationFn:', error);
        
        // In production, try multiple fallback methods with exponential backoff
        if (!import.meta.env.DEV) {
          console.log('🔄 Server 502/timeout detected, trying production fallbacks...');
          console.log('💡 This is normal for serverless deployments that need to wake up');
          
          // Show user feedback that we're retrying
          toast({
            title: "Server wordt opgestart...",
            description: "Even geduld, de server wordt wakker gemaakt. Dit kan enkele seconden duren.",
          });
          
          // Helper function for retry with exponential backoff
          const retryRequest = async (attempt: number): Promise<any> => {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Cap at 10 seconds
            console.log(`⏳ Fallback ${attempt + 1}: Waiting ${delay}ms for server wake-up...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            const response = await fetch('/api/sessions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sessionData),
              credentials: 'include'
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`✅ Retry ${attempt + 1} succeeded:`, result);
              return result;
            }
            
            console.log(`❌ Retry ${attempt + 1} failed: ${response.status}`);
            if (attempt < 3) { // Try up to 4 times total (0, 1, 2, 3)
              return retryRequest(attempt + 1);
            }
            
            throw new Error(`Server still not responding after ${attempt + 1} attempts: ${response.status}`);
          };
          
          try {
            return await retryRequest(0);
          } catch (retryError) {
            console.error('All production retries failed:', retryError);
            throw retryError;
          }
        }
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
      
      // Show more detailed error in production
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      const isProduction = !import.meta.env.DEV;
      
      toast({
        title: "Fout bij sessie aanmaken",
        description: isProduction 
          ? `Productie fout: ${errorMessage}. Controleer je internetverbinding.`
          : "Kon sessie niet aanmaken. Probeer opnieuw.",
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
    
    // Prevent double-clicks by checking if mutation is already pending
    if (createSessionMutation.isPending) {
      console.log('⚠️ Session creation already in progress, ignoring duplicate call');
      return;
    }
    
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
          isLoading={createSessionMutation.isPending}
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
