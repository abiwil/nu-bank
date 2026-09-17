const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const signedCurrencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  signDisplay: "exceptZero",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatSignedCurrency(amount: number) {
  return signedCurrencyFormatter.format(amount);
}

export function formatDate(date: Date) {
  return dateFormatter.format(date);
}
