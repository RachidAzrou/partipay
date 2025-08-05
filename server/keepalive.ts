// Keep-alive service to prevent cold starts
export class KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 5 * 60 * 1000; // 5 minutes

  start() {
    if (this.intervalId) return;
    
    console.log('🚀 Starting keep-alive service');
    
    this.intervalId = setInterval(async () => {
      try {
        // Self-ping to keep server warm
        const response = await fetch(`${process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000'}/api/health`, {
          method: 'GET',
          headers: { 'User-Agent': 'KeepAlive/1.0' }
        });
        
        if (response.ok) {
          console.log('✅ Keep-alive ping successful');
        }
      } catch (error) {
        console.warn('⚠️ Keep-alive ping failed:', error);
      }
    }, this.PING_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Keep-alive service stopped');
    }
  }
}

export const keepAlive = new KeepAliveService();
