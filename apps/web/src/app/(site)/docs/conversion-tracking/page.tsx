import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Info, ExternalLink, BarChart2, Settings } from 'lucide-react'

export const metadata = {
    title: 'How to enable conversion tracking – RegiNor Docs',
    description:
        'Step-by-step guide to connecting Google Analytics 4, Facebook Pixel, and Google Ads to your RegiNor organisation so purchases are reported back to your ad platforms.',
}

export default function ConversionTrackingDoc() {
    return (
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-rn-8">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-rn-2 mb-rn-2">
                    <Badge variant="outline" className="text-xs">Analytics &amp; Tracking</Badge>
                </div>
                <h1 className="rn-h1 not-prose">How to enable conversion tracking</h1>
                <p className="rn-meta text-rn-text-muted mt-rn-2 not-prose">
                    Connect your ad-platform accounts so every completed registration on RegiNor
                    is reported back as a conversion — letting Google and Meta optimise your ads
                    automatically.
                </p>
            </div>

            {/* ── Overview ───────────────────────────────────────────────────── */}
            <section className="not-prose space-y-rn-4">
                <h2 className="rn-h2">Overview</h2>
                <p className="rn-body text-rn-text-muted">
                    The full funnel RegiNor is designed to track looks like this:
                </p>

                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {[
                        'Ad platform (Google / Meta)',
                        '→',
                        'Your website',
                        '→',
                        'RegiNor registration page',
                        '→',
                        'Payment = Conversion 🎉',
                    ].map((step, i) => (
                        step === '→' ? (
                            <span key={i} className="text-rn-text-muted">→</span>
                        ) : (
                            <span key={i} className="bg-rn-surface border border-rn-border rounded px-2 py-1">
                                {step}
                            </span>
                        )
                    ))}
                </div>

                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        RegiNor captures the UTM parameters automatically when a buyer arrives on
                        your registration page from your website. You do not need any server-side
                        setup — just configure your tracking IDs once in your organisation settings.
                    </AlertDescription>
                </Alert>
            </section>

            {/* ── Prerequisites ──────────────────────────────────────────────── */}
            <section className="not-prose space-y-rn-4">
                <h2 className="rn-h2">Prerequisites</h2>
                <ul className="space-y-rn-2 rn-body text-rn-text-muted list-none">
                    {[
                        'You have ORG_ADMIN access to at least one organisation on RegiNor.',
                        'You have a Google Analytics 4 property, a Facebook/Meta Pixel, or a Google Ads conversion action — or any combination of the three.',
                        'Your ad links point to your own website first (not directly to RegiNor).',
                        'Your website\'s "Register" links forward UTM parameters when linking to RegiNor.',
                    ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-rn-success mt-0.5 shrink-0" />
                            {item}
                        </li>
                    ))}
                </ul>
            </section>

            {/* ── Step 1 ─────────────────────────────────────────────────────── */}
            <section className="not-prose space-y-rn-4">
                <h2 className="rn-h2">
                    <span className="text-rn-primary mr-2">1.</span>
                    Configure your tracking IDs in Organisation Settings
                </h2>

                <ol className="space-y-rn-3 rn-body text-rn-text-muted list-none">
                    <li className="flex gap-rn-3">
                        <span className="font-bold text-rn-text shrink-0">a.</span>
                        <span>
                            Go to{' '}
                            <Link href="/staffadmin/settings" className="underline text-rn-primary">
                                Staff Admin → Settings
                            </Link>{' '}
                            and scroll to the <strong>Conversion Tracking</strong> section.
                        </span>
                    </li>
                    <li className="flex gap-rn-3">
                        <span className="font-bold text-rn-text shrink-0">b.</span>
                        <span>
                            Click <strong>Edit settings</strong>, then fill in whichever IDs you need:
                        </span>
                    </li>
                </ol>

                <Card>
                    <CardContent className="pt-6 space-y-rn-4">
                        <TrackingIdField
                            label="Google Analytics 4 ID"
                            placeholder="G-XXXXXXXXXX"
                            description="Found in your GA4 property under Admin → Data Streams → Web stream details."
                            href="https://support.google.com/analytics/answer/9539598"
                        />
                        <TrackingIdField
                            label="Facebook / Meta Pixel ID"
                            placeholder="1234567890"
                            description="Found in Meta Business Suite → Events Manager → your Pixel → Details."
                            href="https://www.facebook.com/business/help/952192354843755"
                        />
                        <TrackingIdField
                            label="Google Ads Conversion ID"
                            placeholder="AW-XXXXXXXXX"
                            description="Found in Google Ads → Goals → Conversions → your conversion action → Tag setup → Use Google Tag Manager or install the tag yourself."
                            href="https://support.google.com/google-ads/answer/6095821"
                        />
                        <TrackingIdField
                            label="Google Ads Conversion Label"
                            placeholder="XXXXXXXXXXXXXXXXXXX"
                            description="The label accompanying the Conversion ID in the same Google Ads conversion action settings page."
                        />
                    </CardContent>
                </Card>

                <ol className="space-y-rn-3 rn-body text-rn-text-muted list-none" start={3}>
                    <li className="flex gap-rn-3">
                        <span className="font-bold text-rn-text shrink-0">c.</span>
                        <span>Click <strong>Save changes</strong>. The IDs take effect immediately — no deployment needed.</span>
                    </li>
                </ol>
            </section>

            {/* ── Step 2 ─────────────────────────────────────────────────────── */}
            <section className="not-prose space-y-rn-4">
                <h2 className="rn-h2">
                    <span className="text-rn-primary mr-2">2.</span>
                    Add UTM parameters to your ad links
                </h2>

                <p className="rn-body text-rn-text-muted">
                    Your ad should send visitors to a page on <em>your</em> website, not directly to RegiNor.
                    Add UTM parameters to the destination URL so that attribution survives the journey
                    from ad → your site → RegiNor.
                </p>

                <p className="rn-body text-rn-text-muted">
                    Typical Google Ads final URL:
                </p>

                <Card>
                    <CardContent className="pt-4 pb-4">
                        <code className="block text-xs bg-rn-surface rounded p-3 break-all">
                            https://salsanor.no/courses<strong>?utm_source=google&amp;utm_medium=cpc&amp;utm_campaign=salsa-spring-2026</strong>
                        </code>
                    </CardContent>
                </Card>

                <p className="rn-body text-rn-text-muted">
                    Typical Meta / Facebook Ads URL parameter configuration:
                </p>

                <Card>
                    <CardContent className="pt-4 pb-4">
                        <code className="block text-xs bg-rn-surface rounded p-3 break-all">
                            utm_source=facebook&amp;utm_medium=paid_social&amp;utm_campaign=&#123;&#123;campaign.name&#125;&#125;&amp;utm_content=&#123;&#123;ad.name&#125;&#125;
                        </code>
                    </CardContent>
                </Card>

                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        Google and Meta both offer automatic UTM tagging inside their respective ad
                        platforms. For Google Ads this is called "auto-tagging" (gclid); for Meta it
                        is built into the Pixel with FBCLID. However, for cross-domain attribution
                        (your site → RegiNor) plain UTM parameters are the most reliable method.
                    </AlertDescription>
                </Alert>
            </section>

            {/* ── Step 3 ─────────────────────────────────────────────────────── */}
            <section className="not-prose space-y-rn-4">
                <h2 className="rn-h2">
                    <span className="text-rn-primary mr-2">3.</span>
                    Forward UTM parameters from your website to RegiNor
                </h2>

                <p className="rn-body text-rn-text-muted">
                    When a visitor arrives on your website from an ad (with UTM params in the URL),
                    your "Register now" / "Sign up" button must include those same UTM params when
                    linking to RegiNor.
                </p>

                <p className="rn-body text-rn-text-muted">
                    The easiest way is to build the link statically with the same parameters you use
                    in your ads. Example link on your website:
                </p>

                <Card>
                    <CardContent className="pt-4 pb-4">
                        <code className="block text-xs bg-rn-surface rounded p-3 break-all">
                            https://reginor.no/org/salsanor/events/salsa-spring?<strong>utm_source=google&amp;utm_medium=cpc&amp;utm_campaign=salsa-spring-2026</strong>
                        </code>
                    </CardContent>
                </Card>

                <p className="rn-body text-rn-text-muted">
                    For more dynamic forwarding (so any campaign automatically flows through) you can
                    use a small JavaScript snippet on your site to copy the current page's UTM params
                    onto the RegiNor link:
                </p>

                <Card>
                    <CardContent className="pt-4 pb-4">
                        <pre className="text-xs bg-rn-surface rounded p-3 overflow-x-auto"><code>{`// Paste this into your website's <head> or just before </body>
document.querySelectorAll('a[href*="reginor.no"]').forEach(a => {
  const src = new URL(window.location.href)
  const dst = new URL(a.href)
  ;['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
    .forEach(p => {
      if (src.searchParams.has(p))
        dst.searchParams.set(p, src.searchParams.get(p))
    })
  a.href = dst.toString()
})`}</code></pre>
                    </CardContent>
                </Card>
            </section>

            {/* ── Step 4: How it fires ────────────────────────────────────────── */}
            <section className="not-prose space-y-rn-4">
                <h2 className="rn-h2">
                    <span className="text-rn-primary mr-2">4.</span>
                    What happens when a buyer completes checkout
                </h2>

                <ol className="space-y-rn-3 rn-body text-rn-text-muted list-none">
                    {[
                        'The buyer lands on RegiNor with UTM params in the URL. RegiNor stores these in a browser cookie (_rn_utm) using first-touch attribution — the cookie is never overwritten once set, so the original campaign gets credit.',
                        'When the buyer creates an order (either by adding to cart or direct sign-up), the UTM values are saved onto the Order record in the database.',
                        'After Stripe confirms the payment, the buyer is redirected to the success page. RegiNor reads the organiser\'s tracking IDs and the order\'s UTM/value and fires:',
                    ].map((text, i) => (
                        <li key={i} className="flex gap-rn-3">
                            <span className="font-bold text-rn-text shrink-0">{i + 1}.</span>
                            <span>{text}</span>
                        </li>
                    ))}
                </ol>

                <ul className="pl-8 space-y-rn-2 rn-body text-rn-text-muted list-none">
                    {[
                        { label: 'GA4 purchase event', icon: '📊' },
                        { label: 'Google Ads conversion event (if Conversion ID + Label are set)', icon: '🎯' },
                        { label: 'Meta Pixel Purchase event (if Pixel ID is set)', icon: '👍' },
                    ].map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </li>
                    ))}
                </ul>

                <p className="rn-body text-rn-text-muted">
                    These events include the order value (in NOK) and the transaction ID, enabling
                    revenue-based conversion reporting in each platform.
                </p>
            </section>

            {/* ── Step 5: View results ───────────────────────────────────────── */}
            <section className="not-prose space-y-rn-4">
                <h2 className="rn-h2">
                    <span className="text-rn-primary mr-2">5.</span>
                    View attribution results in RegiNor
                </h2>

                <p className="rn-body text-rn-text-muted">
                    In addition to seeing conversions in your ad-platform dashboards, you can view
                    UTM attribution directly inside RegiNor:
                </p>

                <Link href="/staffadmin/analytics/conversions" className="block group">
                    <Card className="transition-shadow group-hover:shadow-md">
                        <CardContent className="pt-6 flex items-center gap-rn-4">
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                <BarChart2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-semibold text-rn-text">Conversion Analytics</p>
                                <p className="rn-meta text-rn-text-muted">
                                    Paid orders broken down by utm_source and utm_campaign — with revenue totals.
                                </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-rn-text-muted ml-auto shrink-0" />
                        </CardContent>
                    </Card>
                </Link>
            </section>

            {/* ── Troubleshooting ────────────────────────────────────────────── */}
            <section className="not-prose space-y-rn-4">
                <h2 className="rn-h2">Troubleshooting</h2>

                <div className="space-y-rn-4">
                    <TroubleshootItem
                        q="Orders appear in RegiNor but utm_source is blank."
                        a="The buyer arrived directly on RegiNor without UTM params in the URL. Make sure the link from your website includes the UTM params (see Step 3)."
                    />
                    <TroubleshootItem
                        q="The first click has utm_source=google but a later visit (e.g. via email reminder) overwrites it."
                        a="It won't — RegiNor uses first-touch attribution. Once the _rn_utm cookie is set it is never overwritten during its 30-day lifetime."
                    />
                    <TroubleshootItem
                        q="The GA4 purchase event isn't appearing in my reports."
                        a="Check that you saved a valid GA4 Measurement ID (format: G-XXXXXXXXXX) in your Organisation Settings. Also ensure the buyer didn't block third-party scripts or use an ad-blocker."
                    />
                    <TroubleshootItem
                        q="I changed my GA4 ID — will old orders be affected?"
                        a="No. The conversion pixel fires at the moment of purchase using the ID configured at that time. Changing the ID only affects future purchases."
                    />
                </div>
            </section>

            {/* ── Related ────────────────────────────────────────────────────── */}
            <section className="not-prose space-y-rn-4 border-t border-rn-border pt-rn-6">
                <h2 className="rn-h2">Related</h2>
                <ul className="space-y-rn-2 rn-body">
                    <li>
                        <Link href="/staffadmin/settings" className="underline text-rn-primary flex items-center gap-1">
                            <Settings className="h-4 w-4" />
                            Organisation Settings – Conversion Tracking section
                        </Link>
                    </li>
                    <li>
                        <Link href="/staffadmin/analytics/conversions" className="underline text-rn-primary flex items-center gap-1">
                            <BarChart2 className="h-4 w-4" />
                            Conversion Analytics dashboard
                        </Link>
                    </li>
                </ul>
            </section>
        </article>
    )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TrackingIdField({
    label,
    placeholder,
    description,
    href,
}: {
    label: string
    placeholder: string
    description: string
    href?: string
}) {
    return (
        <div className="space-y-1">
            <p className="text-sm font-medium text-rn-text">{label}</p>
            <code className="inline-block text-xs bg-rn-surface rounded px-2 py-1 text-rn-text-muted">
                {placeholder}
            </code>
            <p className="text-xs text-rn-text-muted">
                {description}{' '}
                {href && (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-rn-primary inline-flex items-center gap-0.5"
                    >
                        Learn more <ExternalLink className="h-3 w-3" />
                    </a>
                )}
            </p>
        </div>
    )
}

function TroubleshootItem({ q, a }: { q: string; a: string }) {
    return (
        <div className="border border-rn-border rounded-lg p-rn-4 space-y-rn-2">
            <p className="font-medium text-rn-text text-sm">Q: {q}</p>
            <p className="text-sm text-rn-text-muted">A: {a}</p>
        </div>
    )
}
