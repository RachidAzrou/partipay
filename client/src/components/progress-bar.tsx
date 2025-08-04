import logoPath from "@assets/Scherm­afbeelding 2025-08-04 om 10.42.08_1754296942837.png";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
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
      <p className="text-sm text-muted-foreground mt-3 font-medium text-center">Stap {currentStep} van {totalSteps}</p>
    </div>
  );
}
