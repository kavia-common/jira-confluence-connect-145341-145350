import React from "react";

export default function NotFound() {
  return (
    <main className="ocean-gradient min-h-[60vh] w-full rounded-2xl p-6">
      <section className="card-surface mx-auto max-w-xl p-6 text-center" role="alert" aria-live="assertive">
        <h1 className="text-2xl font-semibold text-gray-800">404 – Page Not Found</h1>
        <p className="mt-2 text-sm text-gray-600">The page you’re looking for doesn’t exist.</p>
      </section>
    </main>
  );
}
