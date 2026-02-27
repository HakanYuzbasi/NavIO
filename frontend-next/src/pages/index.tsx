/**
 * Landing Page
 * Marketing homepage for NaviO
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Navigation, MapPin, Users, BarChart3, QrCode, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';

const features = [
  {
    icon: MapPin,
    title: 'Indoor Wayfinding',
    description: 'Turn-by-turn navigation with automatic floor plan analysis and smart pathfinding.',
  },
  {
    icon: QrCode,
    title: 'QR-Based Positioning',
    description: 'Visitors scan QR codes to instantly locate themselves — no beacons or hardware needed.',
  },
  {
    icon: Users,
    title: 'Visitor Queue Management',
    description: 'Digital queuing at booths with real-time position updates and browser notifications.',
  },
  {
    icon: BarChart3,
    title: 'Dwell Time Analytics',
    description: 'Track visitor engagement per booth with hourly breakdowns and CSV export.',
  },
  {
    icon: Clock,
    title: 'Real-Time Updates',
    description: 'Live queue status, estimated wait times, and automatic "your turn" alerts.',
  },
  {
    icon: Navigation,
    title: 'Smart Routing',
    description: 'Orthogonal pathfinding with clean L-shaped routes and landmark-based directions.',
  },
];

const useCases = [
  'Trade Shows & Expos',
  'Convention Centers',
  'Museums & Galleries',
  'Shopping Malls',
  'Hospitals & Campuses',
  'Airports & Terminals',
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>NaviO - Indoor Navigation & Visitor Management Platform</title>
      </Head>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Navigation size={18} className="text-white" />
            </div>
            <span className="text-xl font-black text-slate-900">NaviO</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/admin"
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium text-sm">
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
              <Navigation size={14} />
              Indoor Navigation Platform
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-slate-900 leading-tight max-w-3xl mx-auto">
              Navigate Visitors.
              <br />
              <span className="text-indigo-600">Manage Queues.</span>
              <br />
              Measure Engagement.
            </h1>
            <p className="text-xl text-slate-500 mt-6 max-w-2xl mx-auto leading-relaxed">
              The all-in-one platform for indoor wayfinding, visitor queue management, and dwell time analytics — powered by QR codes, no hardware required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link
                href="/login"
                className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2 text-lg"
              >
                Start Free
                <ArrowRight size={20} />
              </Link>
              <Link
                href="#features"
                className="px-8 py-3.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors text-lg"
              >
                See Features
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Everything You Need</h2>
          <p className="text-slate-500 mt-3 text-lg max-w-2xl mx-auto">
            From floor plan analysis to visitor analytics — one platform for your entire venue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg hover:border-indigo-200 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-5">
                <feature.icon size={24} className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Built For</h2>
            <p className="text-slate-500 mt-3 text-lg">Any large indoor venue that needs visitor navigation and management.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {useCases.map((uc) => (
              <div key={uc} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-5 py-4">
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                <span className="font-medium text-slate-700">{uc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="bg-indigo-600 rounded-3xl p-12 sm:p-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Ready to Transform Your Venue?
          </h2>
          <p className="text-indigo-200 text-lg max-w-xl mx-auto mb-8">
            Set up indoor navigation and visitor management in minutes. No hardware, no complexity.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors text-lg shadow-lg"
          >
            Get Started Free
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Navigation size={14} className="text-white" />
              </div>
              <span className="text-lg font-black text-slate-900">NaviO</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
              <Link href="/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} NaviO. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
