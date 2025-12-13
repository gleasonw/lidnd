export function LidndLabel({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-sm text-gray-400">{label}</span>
      {children}
    </label>
  );
}
