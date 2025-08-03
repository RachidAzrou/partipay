import { useParams } from "wouter";
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
      <div className="max-w-sm mx-auto bg-white min-h-screen shadow-xl relative overflow-hidden">
        <ProgressBar currentStep={3} totalSteps={3} />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[hsl(24,_95%,_53%)] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600">Sessie laden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Sessie niet gevonden</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              De sessie kon niet worden geladen. Controleer de link en probeer opnieuw.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen shadow-xl relative overflow-hidden">
      <ProgressBar currentStep={3} totalSteps={3} />
      <SharingDashboard sessionData={sessionData} />
    </div>
  );
}
