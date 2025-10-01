export default function AboutPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 p-4">
        <h2 className="text-xl font-semibold text-gray-800">About</h2>
        <p className="text-sm text-gray-600">
          This app connects to Atlassian Jira and Confluence using OAuth 2.0 or API tokens. Sessions are stored in memory on the backend
          for demonstration purposes.
        </p>
      </header>
      <section className="card-surface p-4">
        <h3 className="section-title">Configuration</h3>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
          <li>Set NEXT_PUBLIC_BACKEND_URL to your FastAPI backend URL (e.g., http://localhost:8000)</li>
          <li>Use OAuth for the smoothest auth flow; API token is also supported</li>
          <li>After authenticating, lists of Jira projects and Confluence spaces will appear</li>
        </ul>
      </section>
    </div>
  );
}
