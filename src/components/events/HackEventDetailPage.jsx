import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { getAllEvents } from '../../services/eventApi';
import { getUserRsvps, saveRsvp, getEventAttendees } from '../../services/rsvpApi';
import { HackProjectSubmissionForm } from './HackProjectSubmissionForm';

export function HackEventDetailPage({ eventId, user, walletAddress, onBack, onLogin, isAuthenticated }) {
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRsvp, setUserRsvp] = useState(null);
    const [showSubmissionForm, setShowSubmissionForm] = useState(false);
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [showProfileCheck, setShowProfileCheck] = useState(false);
    const [joining, setJoining] = useState(false);
    const [attendees, setAttendees] = useState([]);

    useEffect(() => {
        const loadEvent = async () => {
            try {
                setLoading(true);
                const [eventsData, rsvpsData, attendeesData] = await Promise.all([
                    getAllEvents({}),
                    walletAddress ? getUserRsvps(walletAddress) : { rsvps: [] },
                    getEventAttendees(eventId).catch(e => {
                        console.error('Failed to load attendees', e);
                        return { attendees: [] };
                    })
                ]);

                const foundEvent = eventsData.events?.find(e => e.id.toString() === eventId.toString());
                setEvent(foundEvent);

                if (foundEvent && walletAddress) {
                    const rsvp = rsvpsData.rsvps?.find(r => r.event_id === foundEvent.id);
                    setUserRsvp(rsvp?.rsvp_status);

                    if (rsvp?.rsvp_status === 'checked-in') {
                        setIsCheckedIn(true);
                    }
                }

                if (attendeesData.attendees) {
                    setAttendees(attendeesData.attendees);
                }
            } catch (error) {
                console.error('Failed to load event details', error);
            } finally {
                setLoading(false);
            }
        };

        if (eventId) {
            loadEvent();
        }
    }, [eventId, walletAddress]);

    const handleJoinClick = () => {
        setShowProfileCheck(true);
    };

    const confirmJoin = async () => {
        try {
            setJoining(true);
            await saveRsvp({
                eventId: event.id,
                walletAddress,
                rsvpStatus: 'going'
            });

            // Refresh attendees list and state
            setUserRsvp('going');
            setShowProfileCheck(false);
            const updatedAttendees = await getEventAttendees(event.id);
            if (updatedAttendees.attendees) {
                setAttendees(updatedAttendees.attendees);
            }
            alert("You're in! Get ready to build.");
        } catch (error) {
            console.error('Failed to RSVP', error);
            alert('Failed to join event. Please try again.');
        } finally {
            setJoining(false);
        }
    };

    const handleSimulateCheckIn = () => {
        setIsCheckedIn(true);
        alert('Verified! You are checked in for this Hackreation.');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
                <h2 className="text-2xl font-bold">Event not found</h2>
                <Button onClick={onBack}>Return to Hackreation Hub</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 relative">
            {/* Header / Nav */}
            <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Button variant="ghost" onClick={onBack} className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
                        <span>←</span> Back
                    </Button>
                    <div className="font-bold truncate max-w-[200px] sm:max-w-md">{event.title}</div>
                    <div className="w-10"></div>
                </div>
            </div>

            {/* Hero */}
            <div className="relative border-b border-border bg-card/30">
                <div className="max-w-5xl mx-auto px-4 py-12">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Thumbnail */}
                        <div className="w-full md:w-1/3 aspect-video bg-muted rounded-xl overflow-hidden shadow-sm border border-border">
                            {event.thumbnail_url ? (
                                <img src={event.thumbnail_url} alt={event.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-6xl">💻</div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 space-y-4">
                            <Badge variant="outline" className="mb-2">{event.event_type}</Badge>
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{event.title}</h1>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <span>📅</span>
                                    <span>{new Date(event.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span>⏰</span>
                                    <span>{event.time}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span>📍</span>
                                    <span>{event.location}</span>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-wrap gap-3">
                                {isAuthenticated ? (
                                    <>
                                        {userRsvp === 'going' ? (
                                            <div className="flex flex-col gap-3">
                                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 self-start px-3 py-1">
                                                    ✓ You are going!
                                                </Badge>
                                                {isCheckedIn ? (
                                                    <Button size="lg" onClick={() => setShowSubmissionForm(true)} className="bg-primary text-primary-foreground gap-2">
                                                        <span>🚀</span> Submit Project
                                                    </Button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <Button size="lg" variant="secondary" className="gap-2 cursor-not-allowed opacity-80" disabled>
                                                            Check-in Required to Submit
                                                        </Button>
                                                        <Button variant="outline" onClick={handleSimulateCheckIn}>
                                                            [Dev] Sim Check-in
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <Button size="lg" onClick={handleJoinClick} className="gap-2 shadow-lg hover:scale-105 transition-transform">
                                                <span>🎟️</span> Join Event
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <Button onClick={onLogin} size="lg" className="gap-2">
                                        Login to Participate
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs / Sections */}
            <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">

                {/* Who's in the room */}
                <section className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 rounded-2xl p-6 sm:p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Who's In The Room?</h2>
                        <p className="text-muted-foreground">Connect with the talent building the future.</p>
                    </div>

                    {attendees.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {attendees.map((attendee, idx) => {
                                let skills = [];
                                try {
                                    skills = attendee.skills ? JSON.parse(attendee.skills) : [];
                                } catch (e) {
                                    // Fallback if not valid JSON or if it's a simple string
                                    skills = attendee.skills ? [attendee.skills] : [];
                                }
                                const displayName = attendee.display_name || attendee.email?.split('@')[0] || 'Anonymous';
                                const initials = displayName[0]?.toUpperCase() || '?';
                                const role = attendee.role || 'Hacker';

                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-background border border-border/50 rounded-xl p-4 flex flex-col items-center text-center hover:border-primary/30 transition-colors"
                                    >
                                        {attendee.avatar_url ? (
                                            <img src={attendee.avatar_url} alt={displayName} className="w-12 h-12 rounded-full object-cover mb-3" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-3">
                                                {initials}
                                            </div>
                                        )}
                                        <div className="font-semibold text-sm mb-1 truncate w-full" title={displayName}>{displayName}</div>
                                        <div className="text-xs text-muted-foreground mb-2 truncate w-full">{role}</div>
                                        <div className="flex flex-wrap justify-center gap-1 w-full overflow-hidden h-6">
                                            {skills.slice(0, 2).map((skill, skIdx) => (
                                                <span key={skIdx} className="text-[10px] px-1.5 py-0.5 bg-secondary rounded-full text-secondary-foreground truncate max-w-[60px]">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-xl">
                            <div className="text-4xl mb-2">🔭</div>
                            <p className="text-muted-foreground">Be the first to join!</p>
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4">About the Mission</h2>
                    <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                        {event.description?.split('\n').map((paragraph, idx) => {
                            if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                                return <h3 key={idx} className="text-lg font-semibold mt-6 mb-3 text-foreground">{paragraph.replace(/\*\*/g, '')}</h3>;
                            } else if (paragraph.startsWith('**') && paragraph.includes(':**')) {
                                const parts = paragraph.split(':**');
                                return <p key={idx} className="mb-3"><strong className="text-foreground">{parts[0].replace(/\*\*/g, '')}: </strong>{parts[1]}</p>;
                            } else if (paragraph.startsWith('- ')) {
                                return <li key={idx} className="ml-4 mb-2 list-disc">{paragraph.substring(2).replace(/\*\*/g, '')}</li>;
                            } else if (paragraph.match(/^\d+\./)) {
                                return <li key={idx} className="ml-4 mb-2 list-decimal">{paragraph.replace(/^\d+\.\s/, '').replace(/\*\*/g, '')}</li>;
                            } else if (paragraph.trim() === '') {
                                return <div key={idx} className="h-4" />;
                            } else {
                                const formatted = paragraph.split(/(\*\*.*?\*\*)/).map((part, i) => {
                                    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-foreground">{part.replace(/\*\*/g, '')}</strong>;
                                    return part;
                                });
                                return <p key={idx} className="mb-3 leading-relaxed">{formatted}</p>;
                            }
                        })}

                        {!event.description && (
                            <p className="italic opacity-50">No mission details provided yet.</p>
                        )}
                    </div>
                </section>

                {/* Additional Sections (Schedule, Sponsors) kept same as previous */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span>🏆</span> Prizes & Tracks
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex justify-between items-center pb-2 border-b border-border/50">
                                <span>Grand Prize</span>
                                <span className="font-bold text-primary">$1,000</span>
                            </li>
                            <li className="flex justify-between items-center pb-2 border-b border-border/50">
                                <span>Best Design</span>
                                <span className="font-bold text-primary">$500</span>
                            </li>
                            <li className="flex justify-between items-center pb-2 border-b border-border/50">
                                <span>Community Choice</span>
                                <span className="font-bold text-primary">Swag Pack</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span>📋</span> Schedule
                        </h3>
                        <div className="space-y-4 relative pl-4 border-l-2 border-border">
                            <div className="relative">
                                <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background"></span>
                                <div className="text-sm font-bold">09:00 AM</div>
                                <div className="text-muted-foreground">Check-in & Breakfast</div>
                            </div>
                            <div className="relative">
                                <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary/50 ring-4 ring-background"></span>
                                <div className="text-sm font-bold">10:00 AM</div>
                                <div className="text-muted-foreground">Opening Ceremony</div>
                            </div>
                            <div className="relative">
                                <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary/50 ring-4 ring-background"></span>
                                <div className="text-sm font-bold">12:00 PM</div>
                                <div className="text-muted-foreground">Lunch Break</div>
                            </div>
                            <div className="relative">
                                <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary/50 ring-4 ring-background"></span>
                                <div className="text-sm font-bold">05:00 PM</div>
                                <div className="text-muted-foreground">Demos & Judging</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-6">Sponsors</h2>
                    <div className="flex flex-wrap gap-8 items-center justify-center opacity-70 grayscale hover:grayscale-0 transition-all">
                        {/* Mock Sponsors */}
                        <div className="text-2xl font-bold">TechCorp</div>
                        <div className="text-2xl font-bold">CloudSystems</div>
                        <div className="text-2xl font-bold">DevTools Inc</div>
                        <div className="text-2xl font-bold">StartupMKE</div>
                    </div>
                </section>
            </div>

            <HackProjectSubmissionForm
                isOpen={showSubmissionForm}
                onClose={() => setShowSubmissionForm(false)}
                hackathon={event}
                user={user}
                walletAddress={walletAddress}
            />

            {/* Profile Check Modal */}
            {showProfileCheck && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center text-3xl">
                                📝
                            </div>
                            <h2 className="text-2xl font-bold">Is your profile up to date?</h2>
                            <p className="text-muted-foreground">
                                We use your profile to connect you with teammates and mentors during the hackathon. Making sure it's accurate helps everyone!
                            </p>

                            <div className="py-4 bg-muted/30 rounded-lg border border-border/50">
                                <div className="text-sm font-medium mb-1">You will appear as:</div>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                                        {user.email ? user.email[0].toUpperCase() : 'U'}
                                    </div>
                                    <span className="font-semibold">{user.email || 'Anonymous'}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button onClick={confirmJoin} disabled={joining} className="w-full gap-2" size="lg">
                                    {joining ? 'Joining...' : 'Yes, Profile is Good -> Join'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => alert('Redirect to profile edit (Not implemented yet)')}
                                    className="w-full"
                                >
                                    Update Profile First
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowProfileCheck(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
