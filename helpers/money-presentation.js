// Grid formatting in v0.689: ISO minor units, while Summary keeps up to 2 decimals.
// Input is an independently specified English expected amount, never app output.
function gridMoney(text, locale = 'en-US') {
  if (text === '—') return text;
  const match = /^(-?)([A-Z]{3}) ([\d,.]+)$/.exec(text);
  if (!match) throw new Error(`Expected money literal: ${text}`);
  const amount = Number(match[3].replace(/,/g, ''));
  const digits = new Intl.NumberFormat('en-US', { style: 'currency', currency: match[2] })
    .resolvedOptions().maximumFractionDigits;
  return `${match[1]}${match[2]} ${amount.toLocaleString(locale, {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  })}`;
}
module.exports = { gridMoney };
