import logoPath from "@assets/Scherm­afbeelding 2025-07-27 om 01.39.50_1754260283738.png";

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
          className="h-32 w-96 object-contain bg-background p-4"
          style={{ backgroundColor: 'hsl(0, 0%, 98%)' }}
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
      <p className="text-sm text-muted-foreground mt-3 font-medium">Stap {currentStep} van {totalSteps}</p>
    </div>
  );
}
