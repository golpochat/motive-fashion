export default function CookiesPage() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="font-serif text-4xl">Cookies</h1>
      <p>
        Essential cookies keep your cart (`mf_session`, `mf_cart`) and signed-in session (`mf_access`, `mf_refresh`).
        They are required to shop. We set them as HttpOnly where they hold tokens.
      </p>
      <p>
        Choose Essential only or Reject on the banner. Analytics and marketing cookies stay off unless you later opt in.
        Rejecting non-essential cookies does not stop checkout.
      </p>
      <p>
        See <a href="/legal/privacy">Privacy</a> for what we store on the server.
      </p>
    </article>
  );
}
