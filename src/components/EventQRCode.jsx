import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';

export default function EventQRCode({ event }) {
  const canvasRef = useRef(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!event?.check_in_code) {
      setError('No check-in code available for this event');
      return;
    }

    // Generate QR code URL that will trigger check-in
    const checkInUrl = `${window.location.origin}/checkin?code=${event.check_in_code}`;

    // Generate QR code
    const canvas = canvasRef.current;
    if (canvas) {
      QRCode.toCanvas(
        canvas,
        checkInUrl,
        {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        },
        (error) => {
          if (error) {
            console.error('QR code generation error:', error);
            setError('Failed to generate QR code');
          } else {
            // Also create data URL for download
            QRCode.toDataURL(checkInUrl, { width: 600 }, (err, url) => {
              if (!err) {
                setQrCodeDataUrl(url);
              }
            });
          }
        }
      );
    }
  }, [event]);

  const handleDownload = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.download = `${event.title.replace(/\s+/g, '-')}-checkin-qr.png`;
      link.href = qrCodeDataUrl;
      link.click();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const canvas = canvasRef.current;

    if (canvas && printWindow) {
      const dataUrl = canvas.toDataURL();
      printWindow.document.write(`
        <html>
          <head>
            <title>Check-in QR Code - ${event.title}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
              }
              .container {
                text-align: center;
              }
              h1 {
                font-size: 24px;
                margin-bottom: 10px;
              }
              .event-info {
                margin-bottom: 20px;
                color: #666;
              }
              img {
                max-width: 400px;
                border: 2px solid #000;
                padding: 10px;
              }
              .instructions {
                margin-top: 20px;
                font-size: 14px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${event.title}</h1>
              <div class="event-info">
                <p>${event.date} at ${event.time}</p>
                <p>${event.location}</p>
              </div>
              <img src="${dataUrl}" alt="Check-in QR Code" />
              <div class="instructions">
                <p><strong>Scan this QR code to check in to the event</strong></p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Check-in QR Code</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Check-in QR Code</CardTitle>
        <CardDescription>
          Display this QR code at your event venue. Attendees can scan it to check in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg">
          <canvas ref={canvasRef} />
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Check-in Code: <code className="bg-muted px-2 py-1 rounded">{event.check_in_code}</code></p>
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={!qrCodeDataUrl}
          >
            Download QR Code
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
          >
            Print QR Code
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center max-w-md">
          <p>
            When attendees scan this QR code with their phone camera, they'll be taken to a check-in page
            where they can confirm their attendance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
