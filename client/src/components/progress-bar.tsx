import logoPath from "@assets/Scherm­afbeelding 2025-08-04 om 10.42.08_1754296942837.png";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

export default function ProgressBar({ currentStep, totalSteps, onBack }: ProgressBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-center mb-4">
        <img 
          src={logoPath} 
          alt="PartiPay Logo" 
          className="h-52 w-full max-w-2xl object-contain p-2"
          style={{ backgroundColor: 'var(--background)' }}
        />
      </div>
      <div className="flex space-x-3">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`flex-1 h-1 rounded-full transition-all duration-500 ${
              index < currentStep
                ? 'parti-gradient'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-3">
        {onBack && currentStep > 1 ? (
          <button 
            className="w-10 h-10 parti-card rounded-full flex items-center justify-center touch-target hover:parti-shadow-lg transition-all"
            onClick={onBack}
            data-testid="button-back-progress"
          >
            <i className="fas fa-arrow-left text-foreground text-lg"></i>
          </button>
        ) : (
          <div className="w-10"></div>
        )}
        <p className="text-sm text-muted-foreground font-medium">Stap {currentStep} van {totalSteps}</p>
        <div className="w-10"></div>
      </div>
    </div>
  );
}
