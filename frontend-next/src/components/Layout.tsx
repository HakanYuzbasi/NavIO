import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';
import {
    Map,
    QrCode,
    LayoutDashboard,
    Menu,
    X,
    Settings,
    Bell,
    CheckCircle2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import QRScanner from './QRScanner';
import { Breadcrumbs } from './Breadcrumbs';
import { OnboardingTutorial } from './OnboardingTutorial';

interface LayoutProps {
    children: React.ReactNode;
    title?: string;
}

export default function Layout({ children, title = 'NavIO' }: LayoutProps) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Theme and Contrast State
    const [darkMode, setDarkMode] = useState(false);
    const [highContrast, setHighContrast] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Initialize from localStorage
    useEffect(() => {
        const savedDark = localStorage.getItem('navio-dark-mode') === 'true';
        const savedContrast = localStorage.getItem('navio-high-contrast') === 'true';
        setDarkMode(savedDark);
        setHighContrast(savedContrast);
        setIsMounted(true);
    }, []);

    // Apply theme changes
    useEffect(() => {
        if (!isMounted) return;

        const root = window.document.documentElement;
        if (darkMode) root.classList.add('dark');
        else root.classList.remove('dark');

        if (highContrast) root.classList.add('high-contrast');
        else root.classList.remove('high-contrast');

        localStorage.setItem('navio-dark-mode', darkMode.toString());
        localStorage.setItem('navio-high-contrast', highContrast.toString());
    }, [darkMode, highContrast, isMounted]);

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Map View', href: '/admin', icon: Map },
        { name: 'QR Scanner', href: '#', icon: QrCode, onClick: () => setShowScanner(true) },
    ];

    const handleNotificationClick = () => {
        setShowNotifications(prev => !prev);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
            <Head>
                <title>{title}</title>
            </Head>

            {/* Global QR Scanner Overlay */}
            <AnimatePresence>
                {showScanner && (
                    <div className="fixed inset-0 z-[110]">
                        <QRScanner
                            onScan={(data) => {
                                window.location.href = data;
                                setShowScanner(false);
                            }}
                            onClose={() => setShowScanner(false)}
                            onError={(err) => console.error(err)}
                        />
                    </div>
                )}
            </AnimatePresence>

            {/* Notifications Popover */}
            <AnimatePresence>
                {showNotifications && (
                    <>
                        <div className="fixed inset-0 z-[90]" onClick={() => setShowNotifications(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="fixed top-16 right-4 sm:right-8 z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-5 w-80"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                                        <Bell size={16} />
                                    </div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Notifications</h4>
                                </div>
                                <button onClick={() => setShowNotifications(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-green-600 mb-1">
                                        <CheckCircle2 size={14} />
                                        <span className="text-xs font-bold uppercase tracking-wider">System</span>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">All navigation systems are operational.</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Just now</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setShowSettings(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative z-10 overflow-hidden border border-white/10"
                        >
                            <div className="absolute top-0 right-0 p-6">
                                <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">User Settings</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm font-medium">Customize your NavIO experience</p>

                            <div className="space-y-4">
                                <div
                                    onClick={() => setDarkMode(!darkMode)}
                                    className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl flex items-center justify-between cursor-pointer group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all"
                                >
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200">Dark Mode</p>
                                        <p className="text-xs text-slate-400">Reduce eye strain at night</p>
                                    </div>
                                    <div className={cn(
                                        "w-12 h-6 rounded-full relative p-1 transition-colors duration-200",
                                        darkMode ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                                    )}>
                                        <motion.div
                                            animate={{ x: darkMode ? 24 : 0 }}
                                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div
                                    onClick={() => setHighContrast(!highContrast)}
                                    className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl flex items-center justify-between cursor-pointer group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all"
                                >
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200">High Contrast</p>
                                        <p className="text-xs text-slate-400">Better map visibility</p>
                                    </div>
                                    <div className={cn(
                                        "w-12 h-6 rounded-full relative p-1 transition-colors duration-200",
                                        highContrast ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                                    )}>
                                        <motion.div
                                            animate={{ x: highContrast ? 24 : 0 }}
                                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowSettings(false)}
                                className="w-full mt-10 py-4 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-xl shadow-slate-900/20"
                            >
                                Save Changes
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mobile sidebar overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity",
                    sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 transform lg:translate-x-0 lg:static",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100 dark:border-slate-800">
                    <span
                        onClick={() => router.push('/')}
                        className="text-2xl font-black bg-gradient-to-tr from-indigo-600 to-indigo-400 bg-clip-text text-transparent cursor-pointer tracking-tight"
                    >
                        NavIO
                    </span>
                    <button
                        className="lg:hidden p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="p-4 space-y-2 mt-4">
                    {navigation.map((item) => (
                        <div key={item.name}>
                            {item.onClick ? (
                                <button
                                    onClick={() => {
                                        item.onClick?.();
                                        setSidebarOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                        "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 hover:pl-5"
                                    )}
                                >
                                    <item.icon size={20} strokeWidth={2.5} />
                                    {item.name}
                                </button>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                        router.pathname === item.href
                                            ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm"
                                            : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 hover:pl-5",
                                    )}
                                >
                                    <item.icon size={20} strokeWidth={2.5} />
                                    {item.name}
                                </Link>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="absolute bottom-6 left-4 right-4 p-4 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-100 dark:border-slate-800 rounded-3xl">
                    <div
                        onClick={() => setShowSettings(true)}
                        className="flex items-center gap-3 cursor-pointer group"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                            HY
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Hakan Yuzbasi</p>
                            <p className="text-[10px] text-slate-400 truncate font-bold uppercase tracking-widest">Admin</p>
                        </div>
                        <Settings size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Global Header */}
                <header className="h-16 lg:h-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/50 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8">
                    <button
                        className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex-1 flex justify-end items-center gap-2 sm:gap-4">
                        <button
                            onClick={handleNotificationClick}
                            className={cn(
                                "p-2.5 rounded-xl transition-all relative group",
                                showNotifications ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                            )}
                        >
                            <Bell size={22} strokeWidth={2} />
                            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                        </button>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

                        <div
                            onClick={() => setShowSettings(true)}
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 cursor-pointer hidden sm:flex"
                        >
                            <Settings size={20} />
                        </div>
                    </div>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 scrollbar-hide">
                    <div className="max-w-7xl mx-auto p-4 lg:p-8 min-h-full">
                        {/* Breadcrumbs */}
                        <div className="mb-6">
                            <Breadcrumbs />
                        </div>
                        {children}
                    </div>
                </main>

                {/* Onboarding Tutorial */}
                <OnboardingTutorial />
            </div>
        </div>
    );
}
