export default function Input({
  type,
  value,
  onChange,
  placeholder,
  className,
}: {
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={"p-5 border rounded-lg " + className}
    />
  );
}
