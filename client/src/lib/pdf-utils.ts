// PDF generation utilities for receipts
export async function generateReceiptPDF(sessionData: any, type: 'full' | 'personal') {
  const { session, participants, billItems, itemClaims } = sessionData;
  const mainBooker = participants.find((p: any) => p.isMainBooker);
  
  // Create PDF content as HTML string
  const today = new Date();
  const receiptNumber = `${today.getDate().toString().padStart(2, '0')}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear().toString().slice(-2)}001`;
  
  let pdfContent = `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${type === 'full' ? 'Volledige' : 'Persoonlijke'} Rekening - ${session.restaurantName}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 20px;
            color: #000;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h1 {
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 5px 0;
          }
          .header p {
            margin: 2px 0;
            font-size: 11px;
          }
          .receipt-info {
            text-align: center;
            border-top: 1px solid #666;
            border-bottom: 1px solid #666;
            padding: 8px 0;
            margin: 10px 0;
          }
          .items-header {
            border-bottom: 1px solid #666;
            padding-bottom: 3px;
            margin-bottom: 8px;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 8px;
            font-weight: bold;
            font-size: 11px;
          }
          .item-row {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 8px;
            margin-bottom: 3px;
            font-size: 11px;
          }
          .item-details {
            font-size: 10px;
            color: #666;
            margin-left: 5px;
            margin-bottom: 8px;
          }
          .totals {
            border-top: 2px solid #000;
            padding-top: 8px;
            margin-top: 15px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 11px;
          }
          .total-final {
            font-weight: bold;
            font-size: 12px;
            border-top: 1px solid #666;
            padding-top: 3px;
            margin-top: 5px;
          }
          .payment-info {
            margin-top: 15px;
            padding-top: 8px;
            border-top: 1px solid #666;
            font-size: 10px;
            color: #666;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            color: #666;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #666;
          }
          .personal-note {
            background-color: #f0f8ff;
            border: 1px solid #007acc;
            padding: 10px;
            margin: 15px 0;
            border-radius: 5px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DE BLAUWE KATER</h1>
          <p>Grote Markt 8, 9000 Gent</p>
          <p>Tel: 09-123-45-67</p>
          <p>BTW: BE0123.456.789</p>
          <div class="receipt-info">
            <p><strong>BON #${receiptNumber}</strong></p>
            <p>Tafel: ${session.tableNumber} | Kassa: 01</p>
            <p>${today.toLocaleDateString('nl-BE')} ${today.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
  `;

  if (type === 'personal' && mainBooker) {
    // Personal receipt - only claimed items
    pdfContent += `
      <div class="personal-note">
        <strong>PERSOONLIJKE REKENING</strong><br>
        Voor: ${mainBooker.name}<br>
        Via PartiPay - ${session.splitMode === 'items' ? 'Pay your Part' : 'Split the Bill'} modus
      </div>
    `;

    const personalItems = billItems.filter((item: any) => {
      return itemClaims.some((claim: any) => 
        claim.billItemId === item.id && claim.participantId === mainBooker.id
      );
    }).map((item: any) => {
      const claim = itemClaims.find((c: any) => 
        c.billItemId === item.id && c.participantId === mainBooker.id
      );
      return {
        ...item,
        claimedQuantity: claim ? claim.quantity : 0
      };
    });

    pdfContent += `
      <div class="items-header">
        <div>ARTIKEL</div>
        <div style="text-align: center;">AANTAL</div>
        <div style="text-align: right;">PRIJS</div>
        <div style="text-align: right;">TOTAAL</div>
      </div>
    `;

    let personalTotal = 0;
    personalItems.forEach((item: any, index: number) => {
      const itemTotal = parseFloat(item.price) * item.claimedQuantity;
      personalTotal += itemTotal;
      
      pdfContent += `
        <div class="item-row">
          <div>${item.name}</div>
          <div style="text-align: center;">${item.claimedQuantity}</div>
          <div style="text-align: right;">€${parseFloat(item.price).toFixed(2)}</div>
          <div style="text-align: right;"><strong>€${itemTotal.toFixed(2)}</strong></div>
        </div>
        <div class="item-details">
          BTW: 21% | Art.nr: ${1000 + index}
        </div>
      `;
    });

    const personalSubtotal = personalTotal / 1.21;
    const personalBtw = personalTotal - personalSubtotal;

    pdfContent += `
      <div class="totals">
        <div class="total-row">
          <span>Subtotaal (excl. BTW):</span>
          <span>€${personalSubtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>BTW (21%):</span>
          <span>€${personalBtw.toFixed(2)}</span>
        </div>
        <div class="total-row total-final">
          <span>TOTAAL INCL. BTW:</span>
          <span>€${personalTotal.toFixed(2)}</span>
        </div>
      </div>
    `;
  } else {
    // Full receipt - all items
    pdfContent += `
      <div class="items-header">
        <div>ARTIKEL</div>
        <div style="text-align: center;">AANTAL</div>
        <div style="text-align: right;">PRIJS</div>
        <div style="text-align: right;">TOTAAL</div>
      </div>
    `;

    billItems.forEach((item: any, index: number) => {
      const itemTotal = parseFloat(item.price) * item.quantity;
      
      pdfContent += `
        <div class="item-row">
          <div>${item.name}</div>
          <div style="text-align: center;">${item.quantity}</div>
          <div style="text-align: right;">€${parseFloat(item.price).toFixed(2)}</div>
          <div style="text-align: right;"><strong>€${itemTotal.toFixed(2)}</strong></div>
        </div>
        <div class="item-details">
          BTW: 21% | Art.nr: ${1000 + index}
        </div>
      `;
    });

    const totalAmount = parseFloat(session.totalAmount);
    const subtotal = totalAmount / 1.21;
    const btw = totalAmount - subtotal;

    pdfContent += `
      <div class="totals">
        <div class="total-row">
          <span>Subtotaal (excl. BTW):</span>
          <span>€${subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>BTW (21%):</span>
          <span>€${btw.toFixed(2)}</span>
        </div>
        <div class="total-row total-final">
          <span>TOTAAL INCL. BTW:</span>
          <span>€${session.totalAmount}</span>
        </div>
      </div>
    `;
  }

  pdfContent += `
        <div class="payment-info">
          <p>Betaalmethode: Via PartiPay App</p>
          <p>Status: Voltooid - ${today.toLocaleString('nl-BE')}</p>
          ${mainBooker ? `<p>Hoofdboeker: ${mainBooker.name}</p>` : ''}
        </div>
        
        <div class="footer">
          <p><strong>Bedankt voor uw bezoek!</strong></p>
          <p>Bewaar deze bon als bewijs van aankoop</p>
          <p style="margin-top: 10px;">
            Retour binnen 7 dagen mogelijk<br>
            www.deblauwekatergent.be
          </p>
          <p style="margin-top: 10px; font-size: 9px;">
            Gegenereerd door PartiPay - Makkelijk rekeningen splitsen
          </p>
        </div>
      </body>
    </html>
  `;

  // Create and download PDF
  const fileName = `${session.restaurantName}_Tafel${session.tableNumber}_${type === 'full' ? 'Volledig' : 'Persoonlijk'}_${receiptNumber}.pdf`;
  
  // Use browser's print to PDF functionality
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    // Immediate print for super fast experience
    printWindow.onload = () => {
      printWindow.print();
      // Close window after printing
      setTimeout(() => {
        printWindow.close();
      }, 200);
    };
  } else {
    // Fallback: create downloadable HTML file
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace('.pdf', '.html');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export function generateBankingDeeplink(
  amount: string, 
  iban: string, 
  recipient: string, 
  description: string,
  returnUrl: string
): string {
  // Generate banking deeplink - using a universal format that works with most Belgian banking apps
  const baseUrl = 'https://www.ing.be/';
  const params = new URLSearchParams({
    amount: amount,
    iban: iban,
    recipient: recipient,
    description: description,
    returnUrl: returnUrl
  });
  
  // For demo purposes, we'll use a mock deeplink that simulates the banking flow
  // In production, this would be the actual banking deeplink format
  return `partipay://payment-simulator?${params.toString()}`;
}

export async function simulateBankingFlow(
  amount: string,
  sessionId: string,
  onSuccess: () => void,
  onError: (error: string) => void
) {
  // Simulate banking app flow for demo
  const userConfirmed = window.confirm(
    `Bevestig betaling van €${amount}\n\nJe wordt doorgestuurd naar je banking app om de betaling te voltooien.\n\nKlik OK om door te gaan of Cancel om te annuleren.`
  );
  
  if (userConfirmed) {
    // Instant processing for super fast experience
    (async () => {
      // Simulate 95% success rate for better UX
      if (Math.random() > 0.05) {
        try {
          // Complete payment on server
          const response = await fetch(`/api/sessions/${sessionId}/complete-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
          });
          
          if (response.ok) {
            // Redirect to success page
            window.location.href = `/payment-success/${sessionId}`;
          } else {
            onError('Serverfout bij voltooien betaling');
          }
        } catch (error) {
          onError('Netwerkfout bij voltooien betaling');
        }
      } else {
        onError('Betaling geannuleerd of mislukt');
      }
    })();
  } else {
    onError('Betaling geannuleerd door gebruiker');
  }
}