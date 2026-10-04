import { DegreeCalculator } from "@/components/DegreeCalculator";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE } from "@/site";

const faqs = [
  {
    q: "What percentage is a First, 2:1 or 2:2?",
    a: "At most UK universities a First is an overall average of 70% or more, a 2:1 (upper second) is 60–69%, a 2:2 (lower second) is 50–59% and a Third is 40–49%. Below 40% is usually a fail for honours.",
  },
  {
    q: "Does first year count towards my degree?",
    a: "Usually not. Most three-year degrees in England, Wales and Northern Ireland only count the second and final years, and many weight the final year more, for example 30:70 or 1:2. Some universities use only the final year. In Scotland the last two years of a four-year honours degree usually count.",
  },
  {
    q: "Is 69.5% a First?",
    a: "It depends on your university. Some round to the nearest whole mark, so 69.5% becomes 70% and a First. Others keep one decimal place or do not round, and treat 69.5% as a borderline 2:1 that may be raised after a review of your marks. Use the rounding option to see both.",
  },
  {
    q: "How are credits used in the average?",
    a: "Each module's mark counts in proportion to its credits. A 40-credit dissertation counts twice as much as a 20-credit module. A normal full-time year is 120 credits.",
  },
  {
    q: "What is a borderline degree?",
    a: "A mark just below a boundary, often within 1 or 2 marks. Many universities then apply a second rule, such as preponderance (having more than half of your final-year credits in the higher class), to decide whether to raise the result.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: SITE.name,
      url: SITE.url,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
      author: { "@type": "Person", name: "Mahir Faysal", url: "https://mfaysal.com" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bg-[var(--accent)] text-white">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-100">First · 2:1 · 2:2 · Third</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">UK Degree Classification Calculator</h1>
          <p className="mt-3 max-w-2xl text-indigo-50">
            Enter your module marks and credits to see whether you are on track for a First, 2:1 or 2:2. Choose your
            university&apos;s year weighting and rounding rule, and find the mark you need in the rest of your final year.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-3xl px-4">
        <DegreeCalculator />

        <article className="prose-uk mt-10">
          <h2>UK degree classification boundaries</h2>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th scope="col">Classification</th><th scope="col">Overall average</th></tr></thead>
              <tbody>
                <tr><th scope="row">First-class honours (1st)</th><td>70% and above</td></tr>
                <tr><th scope="row">Upper second-class (2:1)</th><td>60–69%</td></tr>
                <tr><th scope="row">Lower second-class (2:2)</th><td>50–59%</td></tr>
                <tr><th scope="row">Third-class honours (3rd)</th><td>40–49%</td></tr>
              </tbody>
            </table>
          </div>

          <h2>How the calculation works</h2>
          <ul>
            <li>Each year&apos;s average is credit-weighted: multiply every mark by its credits, add them up and divide by the total credits.</li>
            <li>The overall mark is the weighted mix of the two years. With 30:70, a 62% second year and a 71% final year give 0.3 × 62 + 0.7 × 71 = 68.3%.</li>
            <li>The rounding option is applied to the overall mark before it is compared with the boundaries.</li>
            <li>The &quot;mark needed&quot; figure is the average you need on the final-year credits that do not have a mark yet, rounded up to one decimal place.</li>
          </ul>

          <h2>Check your own university&apos;s rules</h2>
          <p>
            There is no single national formula. Universities choose their own weighting, whether to drop your lowest credits, how to round,
            and how to treat borderline marks. Your student handbook or the university&apos;s &quot;degree classification&quot; or &quot;award
            algorithm&quot; page has the exact rule. This calculator is a guide, not an official result.
          </p>

          <h2>Questions</h2>
          {faqs.map((f) => (
            <section key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </section>
          ))}
        </article>
      </main>

      <SiteFooter repo={SITE.repo}>
        <p>Your marks are saved in this browser only (localStorage), so they are still here when you come back.</p>
      </SiteFooter>
    </>
  );
}
