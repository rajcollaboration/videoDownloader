import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms governing your use of ${siteConfig.name}.`,
  alternates: { canonical: `${siteConfig.url}/terms` }
};

export default function TermsPage() {
  return (
    <div className="container-shell py-12 md:py-16">
      <article className="card-surface mx-auto max-w-3xl p-6 sm:p-10">
        <p className="section-label">Legal</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose prose-sm mt-8 max-w-none text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using ClipFetch (&quot;the Service&quot;), you agree to be
            bound by these Terms of Service. If you do not agree to these terms, do not
            use the Service.
          </p>

          <h2>2. Permitted Use</h2>
          <p>
            ClipFetch is provided for downloading publicly available video content that
            you own or have explicit permission to download. You may use the Service for:
          </p>
          <ul>
            <li>Downloading your own content for backup purposes.</li>
            <li>Downloading content for which the rights holder has granted permission.</li>
            <li>Downloading content licensed under Creative Commons or similar open licences.</li>
          </ul>

          <h2>3. Prohibited Use</h2>
          <p>
            You agree NOT to use ClipFetch to:
          </p>
          <ul>
            <li>Download copyrighted content without the rights holder&apos;s permission.</li>
            <li>Download private, restricted, or subscriber-only content.</li>
            <li>Redistribute, resell, or commercially exploit downloaded content without permission.</li>
            <li>Attempt to circumvent platform terms of service or digital rights management.</li>
            <li>Use the Service in any way that violates applicable local, national, or international law.</li>
            <li>Abuse or attempt to overload our infrastructure (rate limits apply).</li>
          </ul>

          <h2>4. Intellectual Property</h2>
          <p>
            You are solely responsible for ensuring that your use of downloaded content
            complies with copyright law and the terms of the platform from which the
            content originates. ClipFetch does not grant any intellectual property rights
            in third-party content.
          </p>

          <h2>5. No Warranty</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind,
            either express or implied. We do not guarantee uninterrupted availability,
            download success, or compatibility with all URLs.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, ClipFetch and its
            operators shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of or inability
            to use the Service.
          </p>

          <h2>7. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless ClipFetch and its operators from
            any claims, losses, or damages arising out of your use of the Service or
            violation of these Terms.
          </p>

          <h2>8. Modifications</h2>
          <p>
            We reserve the right to modify these Terms at any time. Continued use of
            the Service after changes constitutes acceptance of the updated Terms.
          </p>

          <h2>9. Termination</h2>
          <p>
            We reserve the right to suspend or terminate access to the Service at our
            discretion, particularly for violations of these Terms.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions about these Terms should be directed to the{" "}
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
