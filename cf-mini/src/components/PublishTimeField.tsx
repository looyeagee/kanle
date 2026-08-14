export default function PublishTimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-adm-text-secondary">发布时间</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 text-sm outline-none sm:w-auto"
      />
    </label>
  );
}
