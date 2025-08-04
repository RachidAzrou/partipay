import logoPath from "@assets/Scherm­afbeelding 2025-08-04 om 10.42.08_1754296942837.png";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

export default function ProgressBar({ currentStep, totalSteps, onBack }: ProgressBarProps) {
  return (
    <div className="sticky top-0 z-50 parti-surface-elevated backdrop-blur-sm border-b border-border px-6 py-4 parti-shadow">
      <div className="flex items-center justify-center mb-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold parti-text-primary mb-1">PartiPay</h1>
          <p className="parti-small">Smart Bill Splitting</p>
        </div>
      </div>
      <div className="flex space-x-3">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`flex-1 h-2 rounded-full transition-all duration-500 ${
              index < currentStep
                ? 'parti-bg-primary'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-4">
        {onBack && currentStep > 1 ? (
          <button 
            className="w-10 h-10 parti-surface-muted rounded-full flex items-center justify-center touch-target hover:parti-shadow-md transition-all parti-shadow"
            onClick={onBack}
            data-testid="button-back-progress"
          >
            <i className="fas fa-arrow-left parti-text-primary text-lg"></i>
          </button>
        ) : (
          <div className="w-10"></div>
        )}
        <p className="parti-small font-medium">Stap {currentStep} van {totalSteps}</p>
        <div className="w-10"></div>
      </div>
    </div>
  );
}
