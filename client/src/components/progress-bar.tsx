import logoPath from "@assets/Scherm­afbeelding 2025-08-04 om 10.42.08_1754296942837.png";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

export default function ProgressBar({ currentStep, totalSteps, onBack }: ProgressBarProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="sticky top-0 z-50 bg-white px-3 py-3 border-b border-gray-100">
      
      <div className="flex items-center justify-center mb-3">
        <img 
          src={logoPath} 
          alt="PartiPay Logo" 
          className="h-16 w-auto object-contain max-w-xs"
        />
      </div>
      
      {/* Visual Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
          <div 
            className="bg-monarch-primary h-1.5 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
            data-testid="visual-progress-bar"
          ></div>
        </div>
        <div className="flex justify-between px-1">
          {Array.from({ length: totalSteps }, (_, index) => (
            <div 
              key={index + 1}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                index + 1 <= currentStep 
                  ? 'bg-monarch-primary' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Step indicator and back button */}
      <div className="flex items-center justify-center relative">
        {onBack && currentStep > 1 && (
          <button 
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center touch-target transition-all duration-200 shadow-sm absolute left-0"
            onClick={onBack}
            data-testid="button-back-progress"
          >
            <i className="fas fa-arrow-left text-gray-700 text-lg"></i>
          </button>
        )}
        <p className="monarch-section-title">Stap {currentStep} van {totalSteps}</p>
      </div>
    </div>
  );
}
