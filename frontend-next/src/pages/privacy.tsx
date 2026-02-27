/**
 * Privacy Policy Page
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Navigation, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Privacy Policy - NaviO</title>
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
        <h1 className="text-4xl font-black text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 mb-12">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
            <p className="text-slate-600 leading-relaxed">
              <strong>Account Information:</strong> When you create an account, we collect your name, email address, and organization name. Passwords are securely hashed and never stored in plain text.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              <strong>Visitor Data:</strong> When visitors join a queue, they may optionally provide their name and phone number. This data is associated with the booth queue entry and the managing organization.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              <strong>Analytics Data:</strong> We collect anonymized dwell time data (time spent at booths), QR scan events, and queue statistics to provide analytics to venue operators.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>To provide indoor navigation and wayfinding services</li>
              <li>To manage visitor queues at booths</li>
              <li>To generate analytics and reports for venue operators</li>
              <li>To send queue notifications (browser notifications, with your permission)</li>
              <li>To maintain and improve our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">3. Data Sharing</h2>
            <p className="text-slate-600 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. Venue operators can access analytics data (dwell times, queue statistics) for their own venues only. Visitor personal information (name, phone) is accessible only to the venue staff managing the queue.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              Account data is retained as long as your account is active. Queue entries and analytics data are retained for the duration specified by the venue operator. Visitors may request deletion of their data by contacting the venue operator.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Data Security</h2>
            <p className="text-slate-600 leading-relaxed">
              We implement industry-standard security measures including encrypted passwords (bcrypt), JWT-based authentication, HTTPS in production, and rate-limited API endpoints. However, no method of electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Your Rights</h2>
            <p className="text-slate-600 leading-relaxed">
              You have the right to access, correct, or delete your personal data. You may export your data in CSV or JSON format through the analytics dashboard. To exercise these rights, contact your venue operator or reach out to us directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Cookies & Local Storage</h2>
            <p className="text-slate-600 leading-relaxed">
              We use browser local storage to maintain your authentication session (JWT token). We do not use tracking cookies or third-party analytics trackers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">8. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have questions about this privacy policy, please contact the venue operator who deployed NaviO at your location.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
