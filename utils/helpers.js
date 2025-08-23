import { NIGERIA_CONFIG } from '../config/nigeriaConfig.js';

// Format Nigerian currency
export const formatNaira = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
};

// Convert date to Nigerian time
export const toNigerianTime = (date) => {
  return date.toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    hour12: true,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get Nigerian holidays for the year
export const getNigerianHolidays = (year) => {
  // Fixed holidays
  const holidays = [
    `${year}-01-01: New Year's Day`,
    `${year}-05-01: Workers' Day`,
    `${year}-05-27: Children's Day`,
    `${year}-06-12: Democracy Day`,
    `${year}-10-01: Independence Day`,
    `${year}-12-25: Christmas Day`,
    `${year}-12-26: Boxing Day`
  ];
  
  // Variable holidays (approximations)
  const easter = getEasterDate(year);
  holidays.push(`${easter}-Good Friday`);
  holidays.push(`${easter}+2-Easter Monday`);
  
  return holidays;
};

// Calculate Easter date (Western Christianity)
function getEasterDate(year) {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const day = I - ((year + f(year / 4) + I + 2 - C + f(C / 4)) % 7) + 28;
  const month = day > 31 ? 4 : 3;
  const dayOfMonth = day - (month === 3 ? 0 : 31);
  
  return `${year}-${month.toString().padStart(2, '0')}-${dayOfMonth.toString().padStart(2, '0')}`;
}

// Generate a Nigerian-themed slug
export const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/\b(naija|nigeria|ng)\b/g, '') // Remove common country identifiers
    .replace(/^-+|-+$/g, '');
};

// Optimize images for Nigerian CDN
export const optimizeImageUrl = (url) => {
  if (!url) return url;
  if (url.startsWith(NIGERIA_CONFIG.cdn.images)) return url;
  
  try {
    const parsedUrl = new URL(url);
    const cdnUrl = `${NIGERIA_CONFIG.cdn.images}/${parsedUrl.hostname}${parsedUrl.pathname}`;
    return cdnUrl;
  } catch (error) {
    return url;
  }
};
 
