"use client";

import React from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  React.useEffect(() => {
    console.error("Global application error", error);
  }, [error]);

  return (
    <html>
      <body className="cards-error-page">
        <div className="cards-error-container">
          <h1>Something went wrong</h1>
          <p>{error?.message || "We couldn't complete that action."}</p>
          <button type="button" onClick={() => reset()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
