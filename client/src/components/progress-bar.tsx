interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-semibold text-gray-900">PartiPay</h1>
        <div className="w-6 h-6 bg-gradient-to-r from-[hsl(24,_95%,_53%)] to-[hsl(38,_92%,_50%)] rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">P</span>
        </div>
      </div>
      <div className="flex space-x-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`flex-1 h-2 rounded-full ${
              index < currentStep
                ? 'bg-gradient-to-r from-[hsl(24,_95%,_53%)] to-[hsl(38,_92%,_50%)]'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-1">Stap {currentStep} van {totalSteps}</p>
    </div>
  );
}
