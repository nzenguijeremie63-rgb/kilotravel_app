import React from 'react';
import 'flag-icons/css/flag-icons.min.css';

// Mapping commonly used country names in French and English, as well as emojis or codes, to ISO 3166-1 alpha-2 codes.
const countryNameToCode: Record<string, string> = {
  // French names
  'france': 'fr',
  'sénégal': 'sn',
  'senegal': 'sn',
  'maroc': 'ma',
  'côte d\'ivoire': 'ci',
  'cote d\'ivoire': 'ci',
  'cote d’ivoire': 'ci',
  'cameroun': 'cm',
  'cameroon': 'cm',
  'mali': 'ml',
  'tunisie': 'tn',
  'tunisia': 'tn',
  'congo': 'cg',
  'rdc': 'cd',
  'rd congo': 'cd',
  'republique democratique du congo': 'cd',
  'république démocratique du congo': 'cd',
  'gabon': 'ga',
  'guinée': 'gn',
  'guinee': 'gn',
  'bénin': 'bj',
  'benin': 'bj',
  'togo': 'tg',
  'burkina faso': 'bf',
  'niger': 'ne',
  'tchad': 'td',
  'madagascar': 'mg',
  'algerie': 'dz',
  'algérie': 'dz',
  'belgique': 'be',
  'suisse': 'ch',
  'canada': 'ca',
  'états-unis': 'us',
  'etats-unis': 'us',
  'usa': 'us',
  'royaume-uni': 'gb',
  'angleterre': 'gb',
  'espagne': 'es',
  'italie': 'it',
  'allemagne': 'de',
  'portugal': 'pt',
  'turquie': 'tr',
  'chine': 'cn',
  'dubai': 'ae',
  'emirats arabes unis': 'ae',
  'émirats arabes unis': 'ae',
  'uae': 'ae',

  // English names
  'morocco': 'ma',
  'ivory coast': 'ci',
  'spain': 'es',
  'italy': 'it',
  'germany': 'de',
  'united kingdom': 'gb',
  'united states': 'us',
  'switzerland': 'ch',
  'belgium': 'be',
  'algeria': 'dz',
};

// Also detect ISO 2-letter emoji flags (e.g. 🇫🇷 -> FR)
function getCodeFromEmoji(emoji: string): string | null {
  if (!emoji || emoji.length < 2) return null;
  const chars = [...emoji];
  if (chars.length >= 2) {
    const code0 = chars[0].codePointAt(0);
    const code1 = chars[1].codePointAt(0);
    if (code0 && code1 && code0 >= 0x1f1e6 && code0 <= 0x1f1ff && code1 >= 0x1f1e6 && code1 <= 0x1f1ff) {
      const char0 = String.fromCharCode(code0 - 0x1f1e6 + 65);
      const char1 = String.fromCharCode(code1 - 0x1f1e6 + 65);
      return `${char0}${char1}`.toLowerCase();
    }
  }
  return null;
}

export function getCountryCode(country?: string, flagInput?: string): string {
  // 1. Check if flagInput is already a 2-letter code
  if (flagInput && flagInput.trim().length === 2 && /^[a-zA-Z]{2}$/.test(flagInput.trim())) {
    return flagInput.trim().toLowerCase();
  }

  // 2. Check if flagInput contains regional indicator emojis
  if (flagInput) {
    const emojiCode = getCodeFromEmoji(flagInput.trim());
    if (emojiCode) return emojiCode;
  }

  // 3. Fallback to country name
  if (country) {
    const cleanCountry = country.trim().toLowerCase();
    if (countryNameToCode[cleanCountry]) {
      return countryNameToCode[cleanCountry];
    }
  }

  return 'un'; // United Nations / international fallback
}

interface CountryFlagProps {
  country?: string;
  flag?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CountryFlag({ country, flag, className = '', size = 'md' }: CountryFlagProps) {
  const code = getCountryCode(country, flag);

  const sizeClasses = {
    sm: 'text-base w-4 h-3',
    md: 'text-xl w-6 h-4',
    lg: 'text-2xl w-8 h-6',
  };

  return (
    <span
      className={`fi fi-${code} rounded-sm shadow-sm inline-block ${sizeClasses[size]} ${className}`}
      title={country || flag}
    />
  );
}
