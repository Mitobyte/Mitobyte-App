import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { getAllEvents, createEvent, updateEvent, deleteEvent } from '../../services/eventApi';

export function HackreationAdmin({ user, dbUser, walletAddress, onClose }) {
    const [activeTab, setActiveTab] = useState('events');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [submissions, setSubmissions] = useState([]);

    // Check admin status
    const isAdmin = user?.email?.startsWith('carl@craftthefuture.xyz') || dbUser?.is_admin === 1 || dbUser?.is_admin === true;

    useEffect(() => {
        fetchHackathons();
        fetchSubmissions();
    }, []);

    const fetchHackathons = async () => {
        try {
            setLoading(true);
            const data = await getAllEvents({});
            const hackathons = (data.events || []).filter(e => e.event_type === 'hackathon');
            setEvents(hackathons);
        } catch (error) {
            console.error('Failed to fetch hackathons:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissions = async () => {
        // Mock submissions for now - replace with real API when available
        setSubmissions([
            { id: 1, projectName: 'AI Code Assistant', teamLead: 'alice@example.com', eventId: 1, status: 'pending', submittedAt: new Date().toISOString() },
            { id: 2, projectName: 'Smart Home Hub', teamLead: 'bob@example.com', eventId: 1, status: 'reviewed', submittedAt: new Date().toISOString() },
        ]);
    };

    const handleDeleteEvent = async (event) => {
        if (!confirm(`Are you sure you want to delete "${event.title}"? This cannot be undone.`)) return;

        try {
            await deleteEvent(event.id);
            setEvents(prev => prev.filter(e => e.id !== event.id));
        } catch (error) {
            console.error('Failed to delete event:', error);
            alert('Failed to delete event');
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const isUpcoming = (dateStr) => new Date(dateStr) >= new Date();

    const stats = {
        total: events.length,
        upcoming: events.filter(e => isUpcoming(e.date)).length,
        past: events.filter(e => !isUpcoming(e.date)).length,
        submissions: submissions.length,
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                    <Button onClick={onClose} className="mt-4">Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={onClose} className="gap-2 pl-0">
                            <span>←</span> Back
                        </Button>
                        <h1 className="text-xl font-bold">Hackreation Admin</h1>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                        🛡️ Admin Mode
                    </Badge>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="text-3xl font-bold">{stats.total}</div>
                        <div className="text-sm text-muted-foreground">Total Hackathons</div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="text-3xl font-bold text-green-500">{stats.upcoming}</div>
                        <div className="text-sm text-muted-foreground">Upcoming</div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="text-3xl font-bold text-muted-foreground">{stats.past}</div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="text-3xl font-bold text-blue-500">{stats.submissions}</div>
                        <div className="text-sm text-muted-foreground">Project Submissions</div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 border-b border-border pb-4">
                    {['events', 'submissions', 'analytics'].map(tab => (
                        <Button
                            key={tab}
                            variant={activeTab === tab ? 'default' : 'ghost'}
                            onClick={() => setActiveTab(tab)}
                            className="capitalize"
                        >
                            {tab === 'events' && '📅 '}
                            {tab === 'submissions' && '📦 '}
                            {tab === 'analytics' && '📊 '}
                            {tab}
                        </Button>
                    ))}
                </div>

                {/* Events Tab */}
                {activeTab === 'events' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Hackathon Events</h2>
                            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                                <span>+</span> Create Hackathon
                            </Button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin text-4xl">⏳</div>
                            </div>
                        ) : events.length === 0 ? (
                            <div className="text-center py-12 bg-card border border-border rounded-xl">
                                <p className="text-muted-foreground mb-4">No hackathons created yet.</p>
                                <Button onClick={() => setShowCreateModal(true)}>Create Your First Hackathon</Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {events.map(event => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold">{event.title}</h3>
                                                <Badge variant={isUpcoming(event.date) ? 'default' : 'secondary'}>
                                                    {isUpcoming(event.date) ? 'Upcoming' : 'Past'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-1">{event.description}</p>
                                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                                <span>📅 {formatDate(event.date)}</span>
                                                <span>📍 {event.location}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setEditingEvent(event)}>
                                                ✏️ Edit
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(event)}>
                                                🗑️ Delete
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Submissions Tab */}
                {activeTab === 'submissions' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Project Submissions</h2>

                        {submissions.length === 0 ? (
                            <div className="text-center py-12 bg-card border border-border rounded-xl">
                                <p className="text-muted-foreground">No project submissions yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {submissions.map(sub => (
                                    <div
                                        key={sub.id}
                                        className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold">{sub.projectName}</h3>
                                                <Badge variant={sub.status === 'pending' ? 'outline' : 'default'}>
                                                    {sub.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Team Lead: {sub.teamLead}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Submitted: {new Date(sub.submittedAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">
                                                👁️ View
                                            </Button>
                                            <Button variant="default" size="sm">
                                                ✅ Approve
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Hackreation Analytics</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-card border border-border rounded-xl p-6">
                                <h3 className="font-bold mb-4">Event Performance</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Total Registrations</span>
                                        <span className="font-bold">--</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Check-in Rate</span>
                                        <span className="font-bold">--</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Submission Rate</span>
                                        <span className="font-bold">--</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-xl p-6">
                                <h3 className="font-bold mb-4">Community Growth</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">New Participants</span>
                                        <span className="font-bold">--</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Returning Hackers</span>
                                        <span className="font-bold">--</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Avg Team Size</span>
                                        <span className="font-bold">--</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-muted/30 border border-border rounded-xl p-6 text-center">
                            <p className="text-muted-foreground">📊 Full analytics dashboard coming soon</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Event Modal */}
            <AnimatePresence>
                {(showCreateModal || editingEvent) && (
                    <HackathonEventModal
                        event={editingEvent}
                        onClose={() => {
                            setShowCreateModal(false);
                            setEditingEvent(null);
                        }}
                        onSuccess={() => {
                            setShowCreateModal(false);
                            setEditingEvent(null);
                            fetchHackathons();
                        }}
                        user={user}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Hackathon Event Create/Edit Modal
function HackathonEventModal({ event, onClose, onSuccess, user }) {
    const [formData, setFormData] = useState({
        title: event?.title || '',
        description: event?.description || '',
        date: event?.date || '',
        time: event?.time || '09:00',
        location: event?.location || '',
        event_type: 'hackathon',
        is_beginner_friendly: event?.is_beginner_friendly || false,
    });
    const [saving, setSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.date || !formData.location) {
            alert('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            if (event) {
                await updateEvent(event.id, formData);
            } else {
                await createEvent({
                    ...formData,
                    createdBy: user?.email || 'admin'
                });
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save event:', error);
            alert('Failed to save event');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed z-50 inset-x-4 top-[5%] bottom-[5%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[85vh] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                style={{ backgroundColor: 'var(--background, #fff)' }}
            >
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">
                        {event ? 'Edit Hackathon' : 'Create Hackathon'}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-sm font-medium mb-1">Title *</label>
                        <Input
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Hackreation: Summer Build"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Join us for an epic day of building..."
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Date *</label>
                            <Input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Time</label>
                            <Input
                                type="time"
                                name="time"
                                value={formData.time}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Location *</label>
                        <Input
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="TechHub Milwaukee"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="is_beginner_friendly"
                            id="beginner_friendly"
                            checked={formData.is_beginner_friendly}
                            onChange={handleChange}
                            className="rounded border-border"
                        />
                        <label htmlFor="beginner_friendly" className="text-sm">Beginner Friendly</label>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving} className="flex-1">
                            {saving ? 'Saving...' : (event ? 'Update' : 'Create')}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </>
    );
}
