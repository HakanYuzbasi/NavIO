/**
 * Terms of Service Page
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Navigation, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Terms of Service - NaviO</title>
      </Head>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Navigation size={18} className="text-white" />
            </div>
            <span className="text-xl font-black text-slate-900">NaviO</span>
          </Link>
          <Link href="/" className="text-slate-500 hover:text-slate-900 text-sm flex items-center gap-1">
            <ArrowLeft size={16} /> Back
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-slate-500 mb-12">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              By accessing or using the NaviO platform (&quot;Service&quot;), you agree to be bound by these Terms of Service. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">2. Description of Service</h2>
            <p className="text-slate-600 leading-relaxed">
              NaviO provides an indoor navigation and visitor management platform, including floor plan analysis, QR-based wayfinding, visitor queue management, and analytics. The Service is provided to venue operators (&quot;Operators&quot;) who deploy it for their visitors (&quot;Visitors&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">3. Account Registration</h2>
            <p className="text-slate-600 leading-relaxed">
              To use operator features, you must create an account with accurate information. You are responsible for maintaining the security of your account credentials. You must notify us immediately if you believe your account has been compromised.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Acceptable Use</h2>
            <p className="text-slate-600 leading-relaxed">You agree not to:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 mt-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Collect visitor data beyond what is necessary for queue management</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Data Ownership</h2>
            <p className="text-slate-600 leading-relaxed">
              Operators retain ownership of their venue data (floor plans, navigation graphs, queue data). NaviO does not claim ownership of any operator or visitor data. You may export your data at any time using the built-in export features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Operator Responsibilities</h2>
            <p className="text-slate-600 leading-relaxed">
              Operators are responsible for obtaining appropriate consent from visitors before collecting personal information (name, phone number) through the queue system. Operators must comply with applicable data protection laws (GDPR, CCPA, etc.) in their jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Service Availability</h2>
            <p className="text-slate-600 leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted access. We may perform maintenance, updates, or experience outages. We will make reasonable efforts to notify operators of planned downtime.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">8. Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed">
              The Service is provided &quot;as is&quot; without warranties of any kind. NaviO shall not be liable for any indirect, incidental, or consequential damages arising from use of the Service. Our total liability shall not exceed the amount paid by you for the Service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">9. Termination</h2>
            <p className="text-slate-600 leading-relaxed">
              Either party may terminate the agreement at any time. Upon termination, operators may export their data. We will retain data for a reasonable period to allow for export, after which it will be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">10. Changes to Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update these terms from time to time. We will notify registered operators of material changes via email. Continued use of the Service after changes constitutes acceptance of the updated terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
