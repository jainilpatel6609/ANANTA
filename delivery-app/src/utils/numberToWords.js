const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelowThousand(num) {
  let str = '';
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    str += ones[num] + ' ';
  }
  return str.trim();
}

export function numberToWordsIndian(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Zero Rupees Only';
  const num = Number(amount);
  if (num === 0) return 'Zero Rupees Only';

  const parts = num.toFixed(2).split('.');
  let integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  let result = '';

  // Crores
  if (integerPart >= 10000000) {
    const crores = Math.floor(integerPart / 10000000);
    result += convertBelowThousand(crores) + ' Crore ';
    integerPart %= 10000000;
  }

  // Lakhs
  if (integerPart >= 100000) {
    const lakhs = Math.floor(integerPart / 100000);
    result += convertBelowThousand(lakhs) + ' Lakh ';
    integerPart %= 100000;
  }

  // Thousands
  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000);
    result += convertBelowThousand(thousands) + ' Thousand ';
    integerPart %= 1000;
  }

  // Hundreds & Below
  if (integerPart > 0) {
    result += convertBelowThousand(integerPart) + ' ';
  }

  result = result.trim() + ' Rupees';

  // Paise
  if (decimalPart > 0) {
    result += ' and ' + convertBelowThousand(decimalPart) + ' Paise';
  }

  return result + ' Only';
}

