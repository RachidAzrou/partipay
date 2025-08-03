interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">PartiPay</h1>
        <div className="w-10 h-10 parti-gradient rounded-full flex items-center justify-center parti-shadow">
          <span className="text-white text-lg font-bold">P</span>
        </div>
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
