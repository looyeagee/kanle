export default function DesktopDecorations() {
  return (
    <div className="pointer-events-none fixed inset-0 hidden overflow-hidden md:block dark:opacity-30">
      <div className="absolute top-[10%] left-[8%] h-12 w-12 rounded-full border-2 border-dashed border-purple-200 opacity-60 animate-float" />
      <div className="absolute top-[35%] left-[12%] h-6 w-6 rounded-full border border-blue-200 opacity-50 animate-float-delayed" />
      <div className="absolute top-[12%] right-[10%] h-10 w-10 rounded-full border-2 border-dashed border-green-200 opacity-60 animate-float-slow" />
      <div className="absolute top-[45%] right-[14%] h-5 w-5 rounded-full border border-indigo-200 opacity-50 animate-float-delayed" />
    </div>
  );
}
