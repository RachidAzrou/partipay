import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function TinkCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const bankLinked = urlParams.get('bank_linked');
        const data = urlParams.get('data');
        const error = urlParams.get('error');

        // Validate OAuth state if available
        const urlState = urlParams.get('state');
        const storedState = sessionStorage.getItem('tink_oauth_state');
        
        if (urlState && storedState && urlState !== storedState) {
          console.error('OAuth state mismatch - possible CSRF attack');
          navigate('/?bank_linked=error&error=invalid_state');
          return;
        }
        
        // Clean up stored state
        if (storedState) {
          sessionStorage.removeItem('tink_oauth_state');
        }

        if (bankLinked === 'success' && data) {
          const bankInfo = JSON.parse(decodeURIComponent(data));
          
          // Validate required fields
          if (!bankInfo.iban || !bankInfo.accountHolder) {
            console.error('Invalid bank info received');
            navigate('/?bank_linked=error&error=invalid_data');
            return;
          }
          
          // Store bank info in sessionStorage for the main app to pick up
          sessionStorage.setItem('partipay_bank_info', JSON.stringify({
            iban: bankInfo.iban,
            accountHolder: bankInfo.accountHolder
          }));
          
          console.log('Bank account successfully linked');
          
          // Navigate back to home with success message
          navigate('/?bank_linked=success');
        } else {
          // Handle error cases
          console.error('Bank linking failed:', error || 'Unknown error');
          navigate(`/?bank_linked=error${error ? `&error=${error}` : ''}`);
        }
      } catch (error) {
        console.error('Callback handling error:', error);
        navigate('/?bank_linked=error&error=callback_error');
      }
    };

    // Small delay to ensure URL is fully loaded
    const timer = setTimeout(handleCallback, 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="parti-container bg-background flex flex-col items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 parti-gradient rounded-full flex items-center justify-center mx-auto parti-shadow animate-spin">
          <i className="fas fa-sync text-white text-2xl"></i>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Bankkoppeling bezig...</h2>
        <p className="text-base text-muted-foreground">Even geduld, we koppelen je rekening.</p>
      </div>
    </div>
  );
}