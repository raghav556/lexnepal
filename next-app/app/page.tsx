const endpoints = ["/api/v1/health", "/api/v1/readiness", "/api/v1/version"];

export default function FoundationPage() {
  return (
    <main className="foundation-shell">
      <p className="eyebrow">LexNepal migration</p>
      <h1>Next.js foundation is running</h1>
      <p>
        Business screens remain on the legacy Vite application until their migration phases are
        complete.
      </p>
      <ul>
        {endpoints.map((endpoint) => (
          <li key={endpoint}>
            <a href={endpoint}>{endpoint}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
