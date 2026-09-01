export default function SizeGuidePage() {
  return (
    <article className="prose max-w-2xl">
      <h1 className="font-serif text-4xl">Size guide</h1>
      <p className="mt-4">Abayas and jilbabs are cut generously. If you are between sizes, take the larger.</p>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr>
            <th>Size</th>
            <th>Bust</th>
            <th>Length</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>S</td>
            <td>92 cm</td>
            <td>140 cm</td>
          </tr>
          <tr>
            <td>M</td>
            <td>98 cm</td>
            <td>142 cm</td>
          </tr>
          <tr>
            <td>L</td>
            <td>104 cm</td>
            <td>144 cm</td>
          </tr>
          <tr>
            <td>XL</td>
            <td>112 cm</td>
            <td>146 cm</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-sm">Hijabs, niqabs, khimars, undercaps, and magnets are one size.</p>
    </article>
  );
}
