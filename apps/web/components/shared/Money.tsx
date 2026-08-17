const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatExactInr = (paise: number): string => inr.format(paise / 100);

export function Money({
  paise,
  className,
}: {
  paise: number;
  className?: string;
}) {
  const rupees = paise / 100;
  return (
    <data className={className} value={rupees}>
      {formatExactInr(paise)}
    </data>
  );
}
