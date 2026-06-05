import type { Metadata } from "next";
import { Mail, MessageSquare } from "lucide-react";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${siteConfig.name} team.`,
  alternates: { canonical: `${siteConfig.url}/contact` }
};

export default function ContactPage() {
  return (
    <div className="container-shell py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="section-label">Get in touch</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Contact Us</h1>
        <p className="mt-4 text-muted-foreground">
          Have a question, a bug report, or a compliance concern? We&apos;re here to help.
          Use the channels below and we&apos;ll get back to you as soon as possible.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {/* General enquiries */}
          <div className="card-surface flex flex-col gap-4 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold">General Enquiries</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Questions about the service, features, or feedback.
              </p>
            </div>
            <a
              href="mailto:hello@clipfetch.io"
              className="mt-auto inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/20"
            >
              hello@clipfetch.io
            </a>
          </div>

          {/* Abuse & compliance */}
          <div className="card-surface flex flex-col gap-4 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10">
              <MessageSquare className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <h2 className="font-bold">Abuse &amp; Copyright</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                DMCA notices, abuse reports, or compliance concerns.
              </p>
            </div>
            <a
              href="mailto:abuse@clipfetch.io"
              className="mt-auto inline-flex items-center gap-2 rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
            >
              abuse@clipfetch.io
            </a>
          </div>
        </div>

        {/* Notice -->*/}
        <div className="mt-8 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Response time:</strong> We aim to
            respond within 2 business days. For urgent copyright or abuse matters, please
            mark your subject line with <em>[URGENT]</em>.
          </p>
        </div>
      </div>
    </div>
  );
}
