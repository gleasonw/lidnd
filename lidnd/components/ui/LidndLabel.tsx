export function LidndLabel({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-sm text-gray-400">{label}</span>
      {children}
    </label>
  );
}
