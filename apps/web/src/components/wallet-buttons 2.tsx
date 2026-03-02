'use client';

import { Button } from '@/components/ui/button';
import { UI_TEXT } from '@/lib/i18n';
import { Wallet } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WalletButtonsProps {
  ticketId: string;
}

export function WalletButtons({ ticketId }: WalletButtonsProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // Detect Android
    const android = /Android/.test(navigator.userAgent);
    
    setIsIOS(iOS);
    setIsAndroid(android);
  }, []);

  const handleGoogleWallet = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/wallet/google`);
      if (response.ok) {
        const { saveUrl } = await response.json();
        window.open(saveUrl, '_blank');
      } else {
        console.error('Failed to generate Google Wallet pass');
        alert('Failed to generate Google Wallet pass. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show both buttons on desktop, or platform-specific on mobile
  const showAppleButton = isIOS || (!isIOS && !isAndroid);
  const showGoogleButton = isAndroid || (!isIOS && !isAndroid);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {showAppleButton && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          <a
            href={`/api/tickets/${ticketId}/wallet/apple`}
            download
          >
            <Wallet className="h-4 w-4 mr-2" />
            {UI_TEXT.tickets.addToAppleWallet}
          </a>
        </Button>
      )}
      {showGoogleButton && (
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleGoogleWallet}
          disabled={isLoading}
        >
          <Wallet className="h-4 w-4 mr-2" />
          {isLoading ? 'Loading...' : UI_TEXT.tickets.addToGoogleWallet}
        </Button>
      )}
    </div>
  );
}
