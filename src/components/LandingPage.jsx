import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import EventsList from './EventsList';
import { MemberDirectory } from './community/MemberDirectory';
import mitobyteLogoLarge from '../mitobyte-c-large.png';
import { SiDiscord, SiLinkedin } from 'react-icons/si';
import { FaGlobe, FaCoffee } from 'react-icons/fa';

// Combined Gallery photos from both Hackreation and Meetups
const galleryPhotos = [
    // Hackreation photos
    '/HackreationGallery/hackreation_10_24_1.afb5eac7.jpeg',
    '/HackreationGallery/hackreation_10_24_2.9f59ea39.jpeg',
    '/HackreationGallery/hackreation_10_24_3.62e5c75a.jpeg',
    '/HackreationGallery/hackreation_10_24_4.5e63429e.jpeg',
    '/HackreationGallery/hackreation_10_24_5.e4140ba8.jpeg',
    '/HackreationGallery/hackreation_10_24_6.8285387c.jpeg',
    // Meetup photos
    '/MeetupsPhotos/1760046004824.jpg',
    '/MeetupsPhotos/1760046005325.jpg',
    '/MeetupsPhotos/1760895373721.jpg',
    '/MeetupsPhotos/1760895377969.jpg',
    '/MeetupsPhotos/1760895379393.jpg',
    '/MeetupsPhotos/1757734951966.jpg',
];

// Feature value props
const valueProps = [
    { emoji: '🚀', title: 'Build', desc: 'Ship real projects at hackathons' },
    { emoji: '🤝', title: 'Connect', desc: 'Meet developers & entrepreneurs' },
    { emoji: '📈', title: 'Grow', desc: 'Expand your tech network' },
];

export function LandingPage({
    darkMode,
    toggleDarkMode,
    handleJoinCommunity,
    status
}) {
    const [activeSection, setActiveSection] = useState(null); // null = hero view
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    // Auto-rotate photos every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentPhotoIndex((prev) => (prev + 1) % galleryPhotos.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // If a section is active, show that content
    if (activeSection) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                {/* Header when viewing content */}
                <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
                    <div className="px-4 h-14 flex items-center justify-between max-w-6xl mx-auto">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <span className="text-lg">←</span>
                            <span className="font-medium">Back</span>
                        </button>
                        <img src={mitobyteLogoLarge} alt="Mitobyte" className="h-6 w-auto" />
                        <button
                            onClick={toggleDarkMode}
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                        >
                            {darkMode ? '☀️' : '🌙'}
                        </button>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 py-8">
                    {activeSection === 'events' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="mb-8 text-center">
                                <h1 className="text-3xl font-bold mb-2">Upcoming Events</h1>
                                <p className="text-muted-foreground">Join us for code, coffee, and community</p>
                            </div>
                            <EventsList user={null} walletAddress={null} />
                        </motion.div>
                    )}

                    {activeSection === 'community' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="mb-8 text-center">
                                <h1 className="text-3xl font-bold mb-2">Our Community</h1>
                                <p className="text-muted-foreground">Meet Milwaukee's tech builders</p>
                            </div>
                            <MemberDirectory currentUserWallet={null} />
                        </motion.div>
                    )}
                </main>

                {/* Footer */}
                <footer className="border-t border-border py-8 px-4 mt-12">
                    <div className="max-w-6xl mx-auto flex flex-col items-center gap-4">
                        <p className="text-sm text-muted-foreground">Follow us</p>
                        <div className="flex gap-3">
                            <a
                                href="https://discord.gg/K3rdUdsnGz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-full bg-[#5865F2] text-white text-sm font-medium flex items-center gap-2"
                            >
                                <SiDiscord size={16} />
                                Discord
                            </a>
                            <a
                                href="https://www.linkedin.com/company/mitobyte"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-full bg-[#0077B5] text-white text-sm font-medium flex items-center gap-2"
                            >
                                <SiLinkedin size={14} />
                                LinkedIn
                            </a>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }

    // Main immersive hero view (SPA/mobile app style)
    return (
        <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
            {/* Top section - Photo Gallery */}
            <div className="relative flex-1 min-h-0">
                {/* Full-width rotating photo background */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPhotoIndex}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2 }}
                        className="absolute inset-0"
                    >
                        <img
                            src={galleryPhotos[currentPhotoIndex]}
                            alt="Community event"
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                </AnimatePresence>

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />

                {/* Content overlay on photo */}
                <div className="absolute inset-0 flex flex-col">
                    {/* Top bar with logo */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center justify-between p-5"
                    >
                        <img src={mitobyteLogoLarge} alt="Mitobyte" className="h-8 w-auto brightness-0 invert" />
                        <button
                            onClick={toggleDarkMode}
                            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white"
                        >
                            {darkMode ? '☀️' : '🌙'}
                        </button>
                    </motion.div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Tagline at bottom of photo */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="p-5 pb-6"
                    >
                        <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Milwaukee Tech Community</p>
                        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                            Build. <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">Connect.</span> Grow.
                        </h1>
                    </motion.div>
                </div>
            </div>

            {/* Bottom section - Compact */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-background border-t border-border px-4 pt-3 pb-2"
            >
                {/* Value props - horizontal scroll */}
                <div className="flex gap-2 mb-3 overflow-x-auto -mx-1 px-1">
                    {valueProps.map((prop, i) => (
                        <div
                            key={i}
                            className="flex-shrink-0 bg-muted rounded-lg px-3 py-2 flex items-center gap-2"
                        >
                            <span className="text-base">{prop.emoji}</span>
                            <div>
                                <div className="font-bold text-xs">{prop.title}</div>
                                <div className="text-muted-foreground text-[10px]">{prop.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3 Pill buttons */}
                <div className="flex flex-col gap-2">
                    <Button
                        onClick={handleJoinCommunity}
                        disabled={status === 'loading'}
                        className="w-full h-11 rounded-full text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                    >
                        {status === 'loading' ? 'Connecting...' : '🔐 Sign Up / Sign In'}
                    </Button>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => setActiveSection('events')}
                            variant="outline"
                            className="flex-1 h-9 rounded-full text-sm font-semibold border"
                        >
                            📅 Events
                        </Button>
                        <Button
                            onClick={() => setActiveSection('community')}
                            variant="outline"
                            className="flex-1 h-9 rounded-full text-sm font-semibold border"
                        >
                            👥 Community
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Compact Footer */}
            <div className="bg-muted border-t border-border px-4 py-3">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">Follow us</p>
                    <div className="flex gap-3 items-center">
                        <a
                            href="https://hcb.hackclub.com/donations/start/mitobyte"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-[#eca400] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                            aria-label="Buy us a coffee"
                        >
                            <FaCoffee size={14} />
                        </a>
                        <a
                            href="https://mitobyte.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
                            aria-label="Website"
                        >
                            <FaGlobe size={14} />
                        </a>
                        <a
                            href="https://discord.gg/K3rdUdsnGz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-[#5865F2] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                            aria-label="Discord"
                        >
                            <SiDiscord size={16} />
                        </a>
                        <a
                            href="https://www.linkedin.com/company/mitobyte"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-[#0077B5] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                            aria-label="LinkedIn"
                        >
                            <SiLinkedin size={14} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
