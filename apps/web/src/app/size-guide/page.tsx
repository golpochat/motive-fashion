import Link from 'next/link';
import { BRAND } from '@motive-fashion/config';
import {
  ABAYA_JILBAB_CHART,
  DRESS_CHART,
  HIJAB_SPECS,
  ONE_SIZE_COPY,
  SIZE_GUIDE_INTRO,
  SIZE_GUIDE_MEASURE_STEPS,
  cm,
  sizeGuideReturnsCopy,
} from '@motive-fashion/utils';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Size guide',
  'House garment measurements for Motive Fashion abayas, jilbabs, dresses, and hijabs. Modest overlay cuts in centimetres.',
);

const th = 'py-2.5 pr-4 font-medium';
const td = 'py-2.5 pr-4';

export default function SizeGuidePage() {
  return (
    <article className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-serif text-4xl">Size guide</h1>
        <p className="mt-4 text-ink/70">{SIZE_GUIDE_INTRO}</p>
      </div>

      <section>
        <h2 className="font-serif text-2xl">How to measure</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink/70">
          {SIZE_GUIDE_MEASURE_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-serif text-2xl">Abayas and jilbabs</h2>
        <p className="mt-2 text-sm text-ink/55">Garment measurements in centimetres. Floor-length overlay.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">Abaya and jilbab garment measurements in centimetres</caption>
            <thead>
              <tr className="border-b border-ink/15">
                <th className={th} scope="col">
                  Size
                </th>
                <th className={th} scope="col">
                  Bust
                </th>
                <th className={th} scope="col">
                  Length
                </th>
                <th className={th} scope="col">
                  Sleeve
                </th>
                <th className="py-2.5 font-medium" scope="col">
                  Fits height
                </th>
              </tr>
            </thead>
            <tbody>
              {ABAYA_JILBAB_CHART.map((row, index) => (
                <tr
                  key={row.size}
                  className={index < ABAYA_JILBAB_CHART.length - 1 ? 'border-b border-ink/10' : undefined}
                >
                  <th className={`${td} font-medium`} scope="row">
                    {row.size}
                  </th>
                  <td className={td}>{cm(row.bust)}</td>
                  <td className={td}>{cm(row.length)}</td>
                  <td className={td}>{cm(row.sleeve)}</td>
                  <td className="py-2.5">{cmRange(row.height)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl">Dresses</h2>
        <p className="mt-2 text-sm text-ink/55">Garment measurements in centimetres. Modest calf length.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">Dress garment measurements in centimetres</caption>
            <thead>
              <tr className="border-b border-ink/15">
                <th className={th} scope="col">
                  Size
                </th>
                <th className={th} scope="col">
                  Bust
                </th>
                <th className={th} scope="col">
                  Hip
                </th>
                <th className={th} scope="col">
                  Length
                </th>
                <th className="py-2.5 font-medium" scope="col">
                  Sleeve
                </th>
              </tr>
            </thead>
            <tbody>
              {DRESS_CHART.map((row, index) => (
                <tr key={row.size} className={index < DRESS_CHART.length - 1 ? 'border-b border-ink/10' : undefined}>
                  <th className={`${td} font-medium`} scope="row">
                    {row.size}
                  </th>
                  <td className={td}>{cm(row.bust)}</td>
                  <td className={td}>{cm(row.hip)}</td>
                  <td className={td}>{cm(row.length)}</td>
                  <td className="py-2.5">{cm(row.sleeve)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl">Hijabs</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink/70">
          {HIJAB_SPECS.map((item) => (
            <li key={item.name}>
              {item.name}: {item.detail}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-2xl">One size</h2>
        <p className="mt-3 text-sm text-ink/70">{ONE_SIZE_COPY}</p>
      </section>

      <p className="text-sm text-ink/70">
        {sizeGuideReturnsCopy(BRAND.city, BRAND.returnDays)}{' '}
        <Link href="/legal/returns">Returns</Link>
      </p>
    </article>
  );
}

function cmRange(value: string) {
  return `${value} cm`;
}
