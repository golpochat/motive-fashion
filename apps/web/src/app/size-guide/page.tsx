export default function SizeGuidePage() {
  return (
    <article className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-serif text-4xl">Size guide</h1>
        <p className="mt-4 text-ink/80">
          Garments are cut modest and slightly generous. If you are between sizes, take the larger. Measurements are of
          the garment, laid flat then doubled for bust.
        </p>
      </div>

      <section>
        <h2 className="font-serif text-2xl">Abayas, jilbabs, and dresses</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/15">
              <th className="py-2">Size</th>
              <th>Bust</th>
              <th>Length</th>
              <th>Sleeve</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-ink/10">
              <td className="py-2">S</td>
              <td>92 cm</td>
              <td>140 cm</td>
              <td>58 cm</td>
            </tr>
            <tr className="border-b border-ink/10">
              <td className="py-2">M</td>
              <td>98 cm</td>
              <td>142 cm</td>
              <td>59 cm</td>
            </tr>
            <tr className="border-b border-ink/10">
              <td className="py-2">L</td>
              <td>104 cm</td>
              <td>144 cm</td>
              <td>60 cm</td>
            </tr>
            <tr>
              <td className="py-2">XL</td>
              <td>112 cm</td>
              <td>146 cm</td>
              <td>61 cm</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-serif text-2xl">Hijabs</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>Everyday chiffon: 180 × 70 cm rectangle.</li>
          <li>Satin square: 90 × 90 cm.</li>
          <li>Jersey instant: one size, stretch cap 54–60 cm head.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-2xl">One size</h2>
        <p className="mt-3 text-sm text-ink/80">
          Niqabs, khimars, prayer sets, undercaps, magnets, and pins are one size. Khimars have a snug cap; if you wear
          a large bun, choose the long khimar.
        </p>
      </section>

      <p className="text-sm text-ink/70">
        Dublin collection: try on in person. Ireland delivery: keep tags on for the 14-day return window.
      </p>
    </article>
  );
}
