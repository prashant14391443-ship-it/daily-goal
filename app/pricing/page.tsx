export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold">Pricing</h1>
      <p className="text-slate-400">Choose your plan.</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <div className="rounded-xl bg-slate-900 p-6">
          <h2 className="font-semibold">Free</h2>
          <p className="text-3xl font-bold mt-2">$0</p>
          <p className="text-slate-400 mt-2">Basic tracking</p>
        </div>
        <div className="rounded-xl bg-blue-600 p-6">
          <h2 className="font-semibold">Pro</h2>
          <p className="text-3xl font-bold mt-2">$9 / month</p>
          <p className="text-slate-200 mt-2">Full dashboard + unlimited tracking</p>
        </div>
      </div>
    </main>
  );
}