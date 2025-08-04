import logoPath from "@assets/Scherm­afbeelding 2025-08-04 om 10.42.08_1754296942837.png";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

export default function ProgressBar({ currentStep, totalSteps, onBack }: ProgressBarProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="sticky top-0 z-50 bg-white px-6 py-6 border-b border-gray-100">
      <div className="flex items-center justify-between mb-6">
        {onBack && currentStep > 1 ? (
          <button 
            className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center touch-target transition-all duration-200 shadow-sm"
            onClick={onBack}
            data-testid="button-back-progress"
          >
            <i className="fas fa-arrow-left text-gray-700 text-lg"></i>
          </button>
        ) : (
          <div className="w-12"></div>
        )}
        <div className="w-12"></div>
      </div>
      
      <div className="flex items-center justify-center mb-4">
        <img 
          src={logoPath} 
          alt="PartiPay Logo" 
          className="h-24 w-auto object-contain max-w-xs"
        />
      </div>
      
      {/* Visual Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-monarch-primary h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
            data-testid="visual-progress-bar"
          ></div>
        </div>
        <div className="flex justify-between px-1">
          {Array.from({ length: totalSteps }, (_, index) => (
            <div 
              key={index + 1}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index + 1 <= currentStep 
                  ? 'bg-monarch-primary' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Step indicator and back button */}
      <div className="flex justify-between items-center">
        <p className="monarch-section-title">Stap {currentStep} van {totalSteps}</p>
        {onBack && currentStep > 1 && (
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
            data-testid="button-back-bottom"
          >
            <i className="fas fa-arrow-left text-gray-700"></i>
            <span className="text-sm font-medium text-gray-700">Terug</span>
          </button>
        )}
      </div>
    </div>
  );
}
