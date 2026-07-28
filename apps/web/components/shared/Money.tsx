const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

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
      {inr.format(rupees)}
    </data>
  );
}
