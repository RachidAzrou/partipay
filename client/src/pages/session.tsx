import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import SharingDashboard from "@/components/sharing-dashboard";
import ProgressBar from "@/components/progress-bar";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Session() {
  const { id } = useParams();

  const { data: sessionData, isLoading, error } = useQuery({
    queryKey: ['/api/sessions', id],
    enabled: !!id,
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  if (isLoading) {
    return (
      <div className="parti-container bg-background flex flex-col">
        <ProgressBar currentStep={3} totalSteps={3} />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 parti-bg-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="parti-body">Sessie laden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="parti-card w-full max-w-md mx-4">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="parti-heading-2">Sessie niet gevonden</h1>
          </div>
          <p className="mt-4 parti-body">
            De sessie kon niet worden geladen. Controleer de link en probeer opnieuw.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="parti-container bg-background flex flex-col">
      <ProgressBar currentStep={3} totalSteps={3} />
      <SharingDashboard sessionData={sessionData} />
    </div>
  );
}
