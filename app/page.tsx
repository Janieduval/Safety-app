export default function HomePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 bg-neutral-50">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-bold text-neutral-900">Daily Task Safety Awareness</h1>
        <p className="text-neutral-600 mt-2">
          Open this app using the QR code posted at your project site. Administrators can sign
          in at <span className="font-mono text-sm">/admin/login</span>.
        </p>
      </div>
    </main>
  );
}
