/**
 * Onboarding Tutorial Component
 * 
 * Interactive tutorial flow for new users to learn NavIO features.
 * Provides step-by-step guidance with visual highlights.
 */
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle2, MapPin, Navigation, QrCode, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string; // CSS selector for element to highlight
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to NavIO!',
    description: 'NavIO helps visitors navigate indoor spaces using QR codes and smart pathfinding. Let\'s get you started.',
    icon: <MapPin size={32} />,
  },
  {
    id: 'venues',
    title: 'Manage Venues',
    description: 'Create and manage your indoor venues. Each venue has its own floor plan and navigation graph.',
    icon: <Navigation size={32} />,
    target: '[data-tutorial="venues"]',
  },
  {
    id: 'navigation',
    title: 'Navigation Graph',
    description: 'Build navigation graphs by adding nodes (waypoints) and edges (paths) to enable route calculation.',
    icon: <Navigation size={32} />,
    target: '[data-tutorial="nodes"]',
  },
  {
    id: 'qr-codes',
    title: 'QR Code Anchors',
    description: 'Generate QR codes for physical placement. When scanned, users can start navigation from that location.',
    icon: <QrCode size={32} />,
    target: '[data-tutorial="qr"]',
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Track usage statistics, QR scan counts, and venue metrics to understand user engagement.',
    icon: <BarChart3 size={32} />,
    target: '[data-tutorial="analytics"]',
  },
];

interface OnboardingTutorialProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompleted = localStorage.getItem('navio-onboarding-completed') === 'true';
    if (!hasCompleted) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('navio-onboarding-completed', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem('navio-onboarding-completed', 'true');
    setIsVisible(false);
    onSkip?.();
  };

  if (!isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] pointer-events-none">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Tutorial Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 pointer-events-auto"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{step.title}</h3>
                    <p className="text-sm text-primary-100 mt-1">
                      Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/20 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="bg-white rounded-full h-2"
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-between gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
                  currentStep === 0
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <ArrowLeft size={16} />
                Previous
              </button>

              <div className="flex gap-2">
                {TUTORIAL_STEPS.map((s, idx) => (
                  <div
                    key={s.id}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      idx === currentStep
                        ? "bg-primary-600"
                        : idx < currentStep
                        ? "bg-primary-300"
                        : "bg-slate-300 dark:bg-slate-700"
                    )}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                {currentStep === TUTORIAL_STEPS.length - 1 ? (
                  <>
                    Complete
                    <CheckCircle2 size={16} />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
