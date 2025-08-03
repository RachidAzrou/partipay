export async function generateQRCode(text: string): Promise<string> {
  // Using qr-server.com API for QR code generation
  const size = 200;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=FFFFFF&color=000000&qzone=1&margin=10&format=png`;
  
  return qrUrl;
}

export function parseQRCode(data: string): { tableNumber: string; restaurantName: string } | null {
  try {
    // In a real implementation, this would parse the actual QR code format
    // For demo purposes, we'll extract from URL or use mock data
    return {
      tableNumber: "7",
      restaurantName: "De Gouden Leeuw"
    };
  } catch (error) {
    console.error('QR parse error:', error);
    return null;
  }
}
