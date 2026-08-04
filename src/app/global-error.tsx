"use client";

// Only renders when the root layout itself fails, so it has to ship its own
// <html>/<body> — none of the app shell is available at this point.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1c1917" }}>
            Приложение недоступно
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#78716c" }}>
            Произошла критическая ошибка. Попробуйте перезагрузить страницу.
          </p>
          {error.digest && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#a8a29e" }}>
              Код ошибки: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              borderRadius: "0.5rem",
              backgroundColor: "#ea580c",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Перезагрузить
          </button>
        </div>
      </body>
    </html>
  );
}
