import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} collects, uses, and protects your information.`,
  alternates: { canonical: `${siteConfig.url}/privacy` }
};

export default function PrivacyPage() {
  return (
    <div className="container-shell py-12 md:py-16">
      <article className="card-surface mx-auto max-w-3xl p-6 sm:p-10">
        <p className="section-label">Legal</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose prose-sm mt-8 max-w-none text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1">
          <h2>1. Information We Collect</h2>
          <p>
            ClipFetch is designed with privacy in mind. We collect only the minimum
            information necessary to operate the service:
          </p>
          <ul>
            <li>
              <strong>Video URLs you submit</strong> — processed transiently to fetch
              metadata and perform downloads. We do not log or store URLs beyond the
              active download session.
            </li>
            <li>
              <strong>Standard server logs</strong> — IP addresses, request timestamps,
              and HTTP status codes retained for up to 7 days for security and abuse
              prevention.
            </li>
            <li>
              <strong>Download job records</strong> — job IDs, status, and progress are
              stored temporarily for real-time tracking. Downloaded files are
              automatically deleted from our servers within 1 hour of completion.
            </li>
          </ul>

          <h2>2. Cookies and Tracking</h2>
          <p>
            ClipFetch does not use tracking cookies or behavioural advertising. We
            may use strictly necessary session tokens for functionality only. Google
            AdSense advertisements may use cookies as described in
            Google&apos;s Privacy Policy.
          </p>

          <h2>3. Third-Party Services</h2>
          <p>
            We may use the following third-party services:
          </p>
          <ul>
            <li><strong>Google AdSense</strong> — for on-site advertising.</li>
            <li><strong>Google Analytics</strong> — for anonymous aggregate traffic analysis (if enabled).</li>
            <li><strong>Cloudflare</strong> — for CDN and DDoS protection.</li>
          </ul>
          <p>
            These services have their own privacy policies. We recommend reviewing
            them independently.
          </p>

          <h2>4. Data Retention</h2>
          <p>
            Downloaded video files are automatically deleted within 1 hour of creation.
            We do not retain personal data beyond what is required for abuse prevention
            (up to 7 days for server logs).
          </p>

          <h2>5. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, or
            request deletion of any personal data we hold about you. Contact us at the
            address below to exercise these rights.
          </p>

          <h2>6. Security</h2>
          <p>
            We implement industry-standard security measures including HTTPS encryption,
            rate limiting, and input validation. However, no internet transmission is
            completely secure.
          </p>

          <h2>7. Children&apos;s Privacy</h2>
          <p>
            ClipFetch is not intended for use by individuals under the age of 13. We do
            not knowingly collect personal information from children.
          </p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            reflected by the &quot;Last updated&quot; date above.
          </p>

          <h2>9. Contact</h2>
          <p>
            For privacy-related inquiries, please use the{" "}
            <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
              Contact page
            </Link>
            .
          </p>
        </div>
      </article>
    </div>
  );
}
