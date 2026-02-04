import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAllEvents } from '../../services/eventApi';
import { getUserRsvps, saveRsvp } from '../../services/rsvpApi';
import { EnhancedEventCard } from './EnhancedEventCard';
import { HackProjectSubmissionForm } from './HackProjectSubmissionForm';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import mitobyteLogo from '../../mitobyte-c-large.png';

export function HackLandingPage({ user, walletAddress, isAuthenticated, onLogin, dbUser }) {
    // Check admin status
    const isAdmin = user?.email?.startsWith('carl@craftthefuture.xyz') || dbUser?.is_admin === 1 || dbUser?.is_admin === true;

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRsvps, setUserRsvps] = useState({});
    const [history, setHistory] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [hackStats, setHackStats] = useState({ attended: 0, wins: 0, projects: 0 });
    const [selectedHackathon, setSelectedHackathon] = useState(null);
    const [showSubmissionForm, setShowSubmissionForm] = useState(false);
    const [checkedInEvents, setCheckedInEvents] = useState({});

    useEffect(() => {
        fetchData();
    }, [walletAddress]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [eventsData, rsvpsData] = await Promise.all([
                getAllEvents({}),
                walletAddress ? getUserRsvps(walletAddress) : { rsvps: [] }
            ]);
            const allEvents = eventsData.events || [];
            const hackathons = allEvents.filter(e => e.event_type === 'hackathon');
            const myRsvps = {};
            const myHistory = [];
            (rsvpsData.rsvps || []).forEach(rsvp => {
                myRsvps[rsvp.event_id] = rsvp.rsvp_status;
                const event = allEvents.find(e => e.id === rsvp.event_id);
                if (event && new Date(event.date) < new Date()) myHistory.push(event);
            });
            const future = hackathons.filter(e => new Date(e.date) >= new Date());
            const past = hackathons.filter(e => new Date(e.date) < new Date());
            setEvents(hackathons);
            setUpcoming(future);
            setHistory(past);
            setUserRsvps(myRsvps);
            setHackStats({ attended: myHistory.length, wins: 0, projects: 0 });
        } catch (error) {
            console.error('Failed to load hackathon data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitProject = (event) => {
        const isCheckedIn = userRsvps[event.id] === 'checked-in' || checkedInEvents[event.id];
        if (!isCheckedIn) {
            alert('Check-in Required: Please scan the QR code at the hackathon venue.');
            return;
        }
        setSelectedHackathon(event);
        setShowSubmissionForm(true);
    };

    const simulateCheckIn = (eventId) => {
        setCheckedInEvents(prev => ({ ...prev, [eventId]: true }));
        alert('Verified! You are now checked in.');
    };

    const handleEventClick = (event) => {
        window.history.pushState({}, '', `/hack/event/${event.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleRsvp = async (event, newStatus) => {
        if (!isAuthenticated) {
            onLogin?.();
            return;
        }
        try {
            if (newStatus) {
                await saveRsvp({
                    eventId: event.id,
                    walletAddress,
                    rsvpStatus: newStatus
                });
                setUserRsvps(prev => ({ ...prev, [event.id]: newStatus }));
            }
        } catch (error) {
            console.error('RSVP failed', error);
            alert('Failed to RSVP. Please try again.');
        }
    };

    const handleAdminClick = () => {
        window.history.pushState({}, '', '/hack/admin');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleBackToHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Mobile-First Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
                <div className="px-4 h-14 flex items-center justify-between">
                    {/* Left: Back + Logo */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBackToHome}
                            className="p-2 -ml-2 hover:bg-foreground/5 rounded-full transition-colors"
                            aria-label="Back to home"
                        >
                            <span className="text-lg">←</span>
                        </button>
                        <img src={mitobyteLogo} alt="Mitobyte" className="h-6 dark:invert-0 invert" />
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <Button
                                onClick={handleAdminClick}
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1.5"
                            >
                                <span>⚙️</span>
                                <span className="hidden sm:inline">Admin</span>
                            </Button>
                        )}
                        {!isAuthenticated && (
                            <Button onClick={onLogin} size="sm" className="text-xs">
                                Login
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section - Mobile Optimized */}
            <section className="px-4 py-8 sm:py-12 lg:py-20 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl mx-auto"
                >
                    {/* Badge */}
                    <Badge variant="outline" className="mb-4 bg-primary/5 border-primary/20 text-primary">
                        Dev Mode: ON
                    </Badge>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight mb-3 sm:mb-4">
                        HACKREATION
                    </h1>

                    {/* Subtitle */}
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-md sm:max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed">
                        Every event is different. Every story matters. Join the community that builds together.
                    </p>

                    {/* Stats - Only for authenticated users */}
                    {walletAddress && (
                        <div className="inline-flex gap-6 sm:gap-8 bg-card border border-border rounded-2xl p-4 sm:p-5">
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl font-bold">{hackStats.attended}</div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Attended</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl font-bold">{hackStats.wins}</div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Awards</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl font-bold">{hackStats.projects}</div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Shipped</div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </section>

            {/* Login Prompt - Mobile Friendly */}
            {!isAuthenticated && (
                <section className="px-4 pb-6">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="bg-primary/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-primary/10 flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex items-center gap-3 flex-1 text-center sm:text-left">
                                <span className="text-2xl sm:text-3xl shrink-0">🔗</span>
                                <div>
                                    <p className="font-semibold text-sm sm:text-base">Sync Your Hacker Profile</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">Track stats, submit projects, unlock rewards</p>
                                </div>
                            </div>
                            <Button onClick={onLogin} className="w-full sm:w-auto shrink-0">
                                Login to Mitobyte
                            </Button>
                        </div>
                    </motion.div>
                </section>
            )}

            {/* The Hackreation Framework - Mobile First Grid */}
            <section className="px-4 py-8 sm:py-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-6 sm:mb-10">
                        <h2 className="text-xl sm:text-2xl font-bold mb-2">THE HACKREATION FRAMEWORK</h2>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            More than just a hackathon. It's a system designed for your growth.
                        </p>
                    </div>

                    {/* Scrollable on mobile, grid on desktop */}
                    <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-3 sm:overflow-visible sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                        {[
                            { icon: "🎨", title: "Unique Experiences", desc: "New themes, new challenges, new vibes every time." },
                            { icon: "🤝", title: "Unmatched Support", desc: "Mentors, peers, and resources always available." },
                            { icon: "⚡", title: "Be Challenged", desc: "Push your limits with challenges that make you grow." },
                            { icon: "📖", title: "Tell Your Story", desc: "Document your journey and showcase your work." },
                            { icon: "👥", title: "Meet New People", desc: "Connect with builders. Find your next co-founder." },
                            { icon: "🔓", title: "Open Source", desc: "Access repos made by the community." },
                            { icon: "🏆", title: "Earn Glory", desc: "Compete for prizes and exclusive badges." },
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                className="shrink-0 w-[200px] sm:w-auto bg-card border border-border p-4 sm:p-5 rounded-xl"
                            >
                                <div className="text-2xl sm:text-3xl mb-3">{item.icon}</div>
                                <h3 className="font-bold text-sm sm:text-base mb-1">{item.title}</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Upcoming Events Section */}
            <section className="px-4 py-8 sm:py-12 bg-muted/30">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                            <span>🚀</span>
                            <span className="hidden sm:inline">Active & Upcoming</span>
                            <span className="sm:hidden">Upcoming</span>
                        </h2>
                        {upcoming.length > 2 && (
                            <Button variant="ghost" size="sm" className="text-xs">
                                View all →
                            </Button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin text-3xl opacity-50">⏳</div>
                        </div>
                    ) : upcoming.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            {upcoming.map(event => {
                                const isCheckedIn = userRsvps[event.id] === 'checked-in' || checkedInEvents[event.id];
                                return (
                                    <div key={event.id} className="relative">
                                        <EnhancedEventCard
                                            event={event}
                                            onClick={() => handleEventClick(event)}
                                            onRsvp={(status) => handleRsvp(event, status)}
                                            rsvpStatus={userRsvps[event.id]}
                                        />

                                        {/* Action Buttons Overlay */}
                                        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex flex-col items-end gap-2">
                                            {isCheckedIn && (
                                                <Badge className="bg-green-500 text-white text-[10px] sm:text-xs">
                                                    ✓ Verified
                                                </Badge>
                                            )}
                                            <div className="flex gap-2">
                                                {!isCheckedIn && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            simulateCheckIn(event.id);
                                                        }}
                                                        className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 bg-background/80 backdrop-blur"
                                                    >
                                                        [Dev] Scan
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSubmitProject(event);
                                                    }}
                                                    className={`text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 ${isCheckedIn
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground'
                                                        }`}
                                                    disabled={!isCheckedIn}
                                                >
                                                    {isCheckedIn ? 'Submit' : 'Check-in First'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-card border border-border rounded-xl">
                            <div className="text-4xl mb-3">🔮</div>
                            <p className="text-muted-foreground text-sm">No upcoming hackathons. Stay tuned!</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Mission History - Only for authenticated */}
            {walletAddress && history.length > 0 && (
                <section className="px-4 py-8 sm:py-12">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
                            <span>📜</span> Mission History
                        </h2>

                        {/* Horizontal scroll on mobile */}
                        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-3 sm:gap-6">
                            {history.map(event => (
                                <div key={event.id} className="shrink-0 w-[280px] sm:w-auto opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                                    <EnhancedEventCard
                                        event={event}
                                        onClick={() => handleEventClick(event)}
                                        onRsvp={(status) => handleRsvp(event, status)}
                                        rsvpStatus={userRsvps[event.id]}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Bottom Padding for mobile */}
            <div className="h-20 sm:h-8" />

            {/* Project Submission Form */}
            <HackProjectSubmissionForm
                isOpen={showSubmissionForm}
                onClose={() => setShowSubmissionForm(false)}
                hackathon={selectedHackathon}
                user={user}
                walletAddress={walletAddress}
            />
        </div>
    );
}
