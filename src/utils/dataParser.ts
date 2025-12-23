// ----------------------------------------------------------------------

const stringParse = (value: string | number | null): string | null => {
  if (!value) return null;
  if (typeof value === 'number') return String(value);
  return value;
};

const floatParse = (value: string | number | null): number | null => {
  if (value === null || value === undefined || value === '' || value === ' ')
    return null;
  if (typeof value === 'number') return value;
  return parseFloat(value.replaceAll('.', '').replace(',', '.'));
};

const dateParse = (value: string | null): Date | null => {
  if (!value || value === '' || value === ' ') return null;
  const [datePart, timePart] = value.split(' ');
  const [dd, MM, yyyy] = datePart.split('/').map(Number);
  const [HH, mm] = timePart.split(':').map(Number);
  return new Date(Date.UTC(yyyy, MM - 1, dd, HH + 3, mm));
};

// ----------------------------------------------------------------------

export const dataParse = {
  string: stringParse,
  float: floatParse,
  date: dateParse,
};
