import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import EventsList from './EventsList';
import { MemberDirectory } from './community/MemberDirectory';
import mitobyteLogoLarge from '../mitobyte-c-large.png';

export function LandingPage({
    darkMode,
    toggleDarkMode,
    handleJoinCommunity,
    status
}) {
    const [activeSection, setActiveSection] = useState('events');
    const [scrolled, setScrolled] = useState(false);

    // Track scroll for header blur effect
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Floating Header - Apple-style glassmorphism */}
            <motion.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                        ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'
                        : 'bg-transparent'
                    }`}
            >
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <motion.div
                        className="flex items-center gap-3"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                    >
                        <img src={mitobyteLogoLarge} alt="Mitobyte" className="h-7 w-auto" />
                    </motion.div>

                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleDarkMode}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {darkMode ? '☀️' : '🌙'}
                        </motion.button>

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                onClick={handleJoinCommunity}
                                disabled={status === 'loading'}
                                className="rounded-full px-6 h-10 font-medium bg-foreground text-background hover:bg-foreground/90 transition-all"
                            >
                                {status === 'loading' ? 'Connecting...' : 'Join'}
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </motion.header>

            {/* Hero Section - Minimal & Bold */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-4"
                    >
                        Milwaukee Tech Community
                    </motion.p>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
                    >
                        Build.
                        <br />
                        <span className="bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">
                            Connect.
                        </span>
                        <br />
                        Grow.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
                    >
                        Where developers, designers, and innovators come together to create the future.
                    </motion.p>
                </div>
            </section>

            {/* Section Toggle - Pill Navigation */}
            <div className="sticky top-20 z-40 py-4 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="max-w-md mx-auto"
                >
                    <div className="flex bg-muted/50 backdrop-blur-sm rounded-full p-1.5 border border-border/50">
                        {[
                            { id: 'events', label: 'Events', icon: '📅' },
                            { id: 'community', label: 'Community', icon: '👥' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSection(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-full text-sm font-medium transition-all duration-300 ${activeSection === tab.id
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Content Sections */}
            <main className="max-w-6xl mx-auto px-6 py-12">
                <AnimatePresence mode="wait">
                    {activeSection === 'events' && (
                        <motion.section
                            key="events"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="mb-12 text-center">
                                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                                    Upcoming Events
                                </h2>
                                <p className="text-muted-foreground">
                                    Join us for code, coffee, and community
                                </p>
                            </div>

                            <EventsList user={null} walletAddress={null} />
                        </motion.section>
                    )}

                    {activeSection === 'community' && (
                        <motion.section
                            key="community"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="mb-12 text-center">
                                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                                    Our Community
                                </h2>
                                <p className="text-muted-foreground">
                                    Meet the people building Milwaukee's tech scene
                                </p>
                            </div>

                            <MemberDirectory currentUserWallet={null} />
                        </motion.section>
                    )}
                </AnimatePresence>
            </main>

            {/* CTA Section */}
            <section className="py-24 px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl mx-auto text-center"
                >
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        Ready to join?
                    </h2>
                    <p className="text-muted-foreground mb-8 text-lg">
                        Be part of something bigger. Connect, collaborate, and grow with Milwaukee's tech community.
                    </p>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                            onClick={handleJoinCommunity}
                            disabled={status === 'loading'}
                            size="lg"
                            className="rounded-full px-10 h-14 text-lg font-medium bg-foreground text-background hover:bg-foreground/90"
                        >
                            {status === 'loading' ? 'Connecting...' : 'Join the Community'}
                        </Button>
                    </motion.div>
                </motion.div>
            </section>

            {/* Minimal Footer */}
            <footer className="border-t border-border/50 py-8 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <img src={mitobyteLogoLarge} alt="Mitobyte" className="h-5 w-auto opacity-60" />
                        <span>© {new Date().getFullYear()}</span>
                    </div>
                    <p>Made with ❤️ in Milwaukee</p>
                </div>
            </footer>
        </div>
    );
}
