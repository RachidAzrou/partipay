import logoPath from "@assets/Scherm­afbeelding 2025-08-04 om 10.42.08_1754296942837.png";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

export default function ProgressBar({ currentStep, totalSteps, onBack }: ProgressBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-background border-b px-6 py-6" style={{borderColor: 'var(--parti-border-light)'}}>
      <div className="flex items-center justify-center mb-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-1">PartiPay</h1>
          <p className="parti-body">Simple Bill Splitting</p>
        </div>
      </div>
      <div className="flex space-x-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`flex-1 h-1 rounded-full transition-all duration-300 ${
              index < currentStep
                ? 'parti-bg-primary'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-6">
        {onBack && currentStep > 1 ? (
          <button 
            className="w-9 h-9 rounded-lg flex items-center justify-center touch-target hover:bg-muted transition-colors"
            onClick={onBack}
            data-testid="button-back-progress"
          >
            <i className="fas fa-arrow-left text-foreground text-base"></i>
          </button>
        ) : (
          <div className="w-9"></div>
        )}
        <p className="parti-body font-medium">Stap {currentStep} van {totalSteps}</p>
        <div className="w-9"></div>
      </div>
    </div>
  );
}
