export const VALID_POSITION_TYPES = {
  'פתיחת נושא': 'opening',
  'הקנייה': 'teaching',
  'תרגול': 'practice',
  'סיכום נושא': 'summary'
} as const;

export const VALID_SPACE_USAGE = {
  'מליאה': 'whole',
  'עבודה בקבוצות': 'groups',
  'עבודה אישית': 'individual',
  'משולב': 'mixed'
} as const;

export const VALID_SCREEN_TYPES = {
  'סרטון': 'video',
  'תמונה': 'image',
  'פדלט': 'padlet',
  'אתר': 'website',
  'ג\'ניאלי': 'genially',
  'מצגת': 'presentation'
} as const;

export function mapPositionToEnglish(hebrewValue: string): string {
  return VALID_POSITION_TYPES[hebrewValue as keyof typeof VALID_POSITION_TYPES] || hebrewValue;
}

export function mapSpaceUsageToEnglish(hebrewValue: string): string {
  return VALID_SPACE_USAGE[hebrewValue as keyof typeof VALID_SPACE_USAGE] || hebrewValue;
}

export function mapScreenTypeToEnglish(hebrewValue: string): string {
  return VALID_SCREEN_TYPES[hebrewValue as keyof typeof VALID_SCREEN_TYPES] || hebrewValue;
}
