/**
 * A lightweight AD <-> BS date conversion utility mock for Srimar Law.
 * In a production app, this would use a robust library like `nepali-date` or `bikram-sambat`.
 * For this prototype, we'll implement a simple, approximate conversion based on common offsets.
 */

const AD_BS_OFFSET_YEARS = 56;
const AD_BS_OFFSET_MONTHS = 8; // Roughly, April (4) is Baishakh (1), Jan (1) is Magh (9/10)

const NEPALI_MONTHS = [
  "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

const NEPALI_MONTHS_NE = [
  "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
  "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"
];

// Simple number to Nepali numeral converter
export function toNepaliNumeral(num: number | string): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return num.toString().split('').map(digit => {
    if (/[0-9]/.test(digit)) {
      return nepaliDigits[parseInt(digit)];
    }
    return digit;
  }).join('');
}

// Convert AD Date to BS string (Approximate for mock)
export function getBSDate(adDateString: string, inNepali: boolean = false): string {
  if (!adDateString) return "";
  
  try {
    const d = new Date(adDateString);
    if (isNaN(d.getTime())) return adDateString;

    let bsYear = d.getFullYear() + AD_BS_OFFSET_YEARS;
    let bsMonthIndex = d.getMonth() + AD_BS_OFFSET_MONTHS;
    
    if (bsMonthIndex >= 12) {
      bsMonthIndex -= 12;
      bsYear += 1;
    }
    
    // Very rough day approximation for visual purposes
    let bsDay = d.getDate() + 15;
    if (bsDay > 30) {
      bsDay -= 30;
      bsMonthIndex += 1;
      if (bsMonthIndex >= 12) {
        bsMonthIndex -= 12;
        bsYear += 1;
      }
    }

    const monthName = inNepali ? NEPALI_MONTHS_NE[bsMonthIndex] : NEPALI_MONTHS[bsMonthIndex];
    const yearStr = inNepali ? toNepaliNumeral(bsYear) : bsYear.toString();
    const dayStr = inNepali ? toNepaliNumeral(bsDay) : bsDay.toString().padStart(2, '0');

    return `${dayStr} ${monthName} ${yearStr}`;
  } catch (e) {
    return adDateString;
  }
}
