import logoPath from "@assets/Scherm­afbeelding 2025-08-04 om 10.42.08_1754296942837.png";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

export default function ProgressBar({ currentStep, totalSteps, onBack }: ProgressBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-background px-6 py-6">
      <div className="flex items-center justify-between mb-8">
        {onBack && currentStep > 1 ? (
          <button 
            className="w-10 h-10 rounded-full flex items-center justify-center touch-target hover:bg-muted transition-colors"
            onClick={onBack}
            data-testid="button-back-progress"
          >
            <i className="fas fa-arrow-left text-foreground text-lg"></i>
          </button>
        ) : (
          <div className="w-10"></div>
        )}
        <p className="parti-step-indicator">Stap {currentStep} van {totalSteps}</p>
        <div className="w-10"></div>
      </div>
      <div className="flex items-center justify-center mb-6">
        <img 
          src={logoPath} 
          alt="PartiPay Logo" 
          className="h-16 w-auto object-contain"
        />
      </div>
    </div>
  );
}
