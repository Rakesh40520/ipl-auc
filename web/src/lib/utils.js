import confetti from 'canvas-confetti';

/**
 * Format Lakhs into Indian Currency notation
 * E.g., 200 -> "₹2 Cr", 250 -> "₹2.5 Cr", 30 -> "₹30 L", 12000 -> "₹120 Cr"
 */
export function formatLakhs(lakhs) {
  if (lakhs == null || isNaN(lakhs)) return '₹0';
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    const formatted = cr % 1 === 0 ? cr.toString() : cr.toFixed(2).replace(/\.?0+$/, '');
    return `₹${formatted} Cr`;
  }
  return `₹${lakhs} L`;
}

/**
 * Get Franchise Palette & Accents
 */
export const FRANCHISE_COLORS = {
  CSK: { primary: '#F4C20D', text: '#1A1500', name: 'Chennai Super Kings' },
  MI: { primary: '#0B8EC9', text: '#FFFFFF', name: 'Mumbai Indians' },
  RCB: { primary: '#D1121B', text: '#FFFFFF', name: 'Royal Challengers Bengaluru' },
  KKR: { primary: '#6A3FA0', text: '#FFFFFF', name: 'Kolkata Knight Riders' },
  SRH: { primary: '#F26B1D', text: '#FFFFFF', name: 'Sunrisers Hyderabad' },
  DC: { primary: '#3B5BDB', text: '#FFFFFF', name: 'Delhi Capitals' },
  RR: { primary: '#E83E8C', text: '#FFFFFF', name: 'Rajasthan Royals' },
  PBKS: { primary: '#F25C54', text: '#FFFFFF', name: 'Punjab Kings' },
  LSG: { primary: '#1FA6B5', text: '#FFFFFF', name: 'Lucknow Super Giants' },
  GT: { primary: '#1C2B47', text: '#FFFFFF', name: 'Gujarat Titans' }
};

export function getFranchise(code) {
  return FRANCHISE_COLORS[code] || { primary: '#8b73ff', text: '#ffffff', name: code };
}

/**
 * Trigger celebration confetti with franchise colors
 */
export function triggerConfetti(primaryColor = '#f4c20d') {
  try {
    const colors = [primaryColor, '#ff4d8d', '#ffd84d', '#8b73ff', '#12b76a'];
    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.6 },
      colors
    });
  } catch (err) {
    // Ignore if canvas-confetti unavailable
  }
}

/**
 * Modern Web Guidance: Setup light-dismiss fallback for <dialog> elements
 * Ensures clicks on the backdrop close the modal in all browsers.
 */
export function setupDialogLightDismiss(dialog) {
  if (!dialog) return;
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isDialogContent) {
        dialog.close();
      }
    });
  }
}
