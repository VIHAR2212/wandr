// src/components/trip/SendToWhatsAppButton.tsx
"use client";

interface SendToWhatsAppButtonProps {
  tripTitle: string;
  destination: string;
}

// Twilio's WhatsApp sandbox number. If you move off the sandbox to a
// real WhatsApp Business number later, just update this constant.
const TWILIO_SANDBOX_NUMBER = "14155238886"; // no "+" or spaces for wa.me links

export default function SendToWhatsAppButton({
  tripTitle,
  destination,
}: SendToWhatsAppButtonProps) {
  const handleSendToWhatsApp = () => {
    // This pre-fills "send itinerary" into a chat with the Twilio sandbox
    // number. The user still has to tap Send themselves — WhatsApp's
    // click-to-chat links don't allow auto-sending, by design (prevents spam).
    const message = "send itinerary";
    const encodedMessage = encodeURIComponent(message);
    const waLink = `https://wa.me/${TWILIO_SANDBOX_NUMBER}?text=${encodedMessage}`;

    window.open(waLink, "_blank");
  };

  return (
    <button
      onClick={handleSendToWhatsApp}
      className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1ebe57] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
      aria-label={`Send ${tripTitle} itinerary to WhatsApp`}
    >
      <WhatsAppIcon />
      Send to WhatsApp
    </button>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.93.56 3.73 1.5 5.26L2 22l4.97-1.6a9.87 9.87 0 0 0 5.07 1.38c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.78 14.04c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.16-4.93-4.35-.14-.19-1.18-1.57-1.18-3 0-1.42.74-2.12 1-2.41.27-.29.58-.36.78-.36.2 0 .39.01.56.01.18.01.42-.07.66.5.24.59.82 2.03.9 2.18.07.14.12.31.02.49-.1.18-.15.29-.29.45-.14.16-.3.36-.42.48-.14.14-.29.29-.13.57.17.28.75 1.25 1.62 2.03 1.12 1 2.07 1.31 2.36 1.46.29.14.46.12.63-.07.17-.19.74-.85.94-1.14.2-.29.4-.24.66-.14.27.1 1.7.8 1.99.95.29.14.49.21.56.33.07.12.07.69-.17 1.37z" />
    </svg>
  );
}

