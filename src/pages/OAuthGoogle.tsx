import { useEffect } from "react";

export function OAuthGoogle() {
  useEffect(() => {
    // Extract access token from URL hash
    const hash = window.location.hash;
    const match = hash.match(/access_token=([^&]+)/);

    if (match && window.opener) {
      // Send token back to opener window
      window.opener.postMessage(
        { type: "google_oauth_token", accessToken: match[1] },
        "*"
      );
      // Close this popup
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400 text-sm">Completing authentication...</p>
        <p className="text-zinc-500 text-xs mt-2">This window will close automatically.</p>
      </div>
    </div>
  );
}
