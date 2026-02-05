import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { getAllEvents } from '../../services/eventApi';
import { getAdminEventAttendees } from '../../services/rsvpApi';
import { exportToCSV, formatDateForCSV } from '../../utils/csvExport';

/**
 * RSVPAttendees Component
 * Admin component to view and export RSVP attendees for events
 */
export default function RSVPAttendees() {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [attendees, setAttendees] = useState([]);
    const [eventDetails, setEventDetails] = useState(null);
    const [stats, setStats] = useState({ going: 0, maybe: 0, no: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingAttendees, setLoadingAttendees] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Fetch events on mount
    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getAllEvents();
            // Sort by date, newest first
            const sorted = (data.events || []).sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            );
            setEvents(sorted);

            // Auto-select first event if available
            if (sorted.length > 0) {
                setSelectedEventId(sorted[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch events:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch attendees when event is selected
    useEffect(() => {
        if (selectedEventId) {
            fetchAttendees(selectedEventId);
        }
    }, [selectedEventId]);

    const fetchAttendees = async (eventId) => {
        try {
            setLoadingAttendees(true);
            const data = await getAdminEventAttendees(eventId);
            setAttendees(data.attendees || []);
            setEventDetails(data.event);
            setStats(data.stats || { going: 0, maybe: 0, no: 0, total: 0 });
        } catch (err) {
            console.error('Failed to fetch attendees:', err);
            setAttendees([]);
            setStats({ going: 0, maybe: 0, no: 0, total: 0 });
        } finally {
            setLoadingAttendees(false);
        }
    };

    // Filter attendees
    const filteredAttendees = useMemo(() => {
        let filtered = [...attendees];

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(a => a.rsvp_status === statusFilter);
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(a =>
                a.display_name?.toLowerCase().includes(term) ||
                a.email?.toLowerCase().includes(term) ||
                a.role?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [attendees, statusFilter, searchTerm]);

    const handleExportCSV = () => {
        if (filteredAttendees.length === 0) {
            alert('No attendees to export');
            return;
        }

        const columns = [
            { key: 'display_name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'rsvp_status', label: 'RSVP Status' },
            { key: 'role', label: 'Role/Tagline' },
            { key: 'rsvp_created_at', label: 'RSVP Date' }
        ];

        const formattedData = filteredAttendees.map(a => ({
            ...a,
            rsvp_created_at: formatDateForCSV(a.rsvp_created_at)
        }));

        const eventTitle = eventDetails?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'event';
        exportToCSV(formattedData, `rsvp_attendees_${eventTitle}`, columns);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            going: 'bg-green-500/10 text-green-600 border-green-500/20',
            maybe: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
            no: 'bg-red-500/10 text-red-600 border-red-500/20'
        };
        const icons = { going: '✅', maybe: '🤔', no: '❌' };
        return (
            <Badge variant="outline" className={styles[status] || ''}>
                <span className="mr-1">{icons[status]}</span>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-muted-foreground">Loading events...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                    <div className="text-2xl">⚠️</div>
                    <div>
                        <h3 className="font-semibold text-destructive mb-1">Error Loading Events</h3>
                        <p className="text-sm text-destructive/80">{error}</p>
                        <Button onClick={fetchEvents} variant="outline" size="sm" className="mt-3">
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">RSVP Attendees</h2>
                    <p className="text-sm text-muted-foreground">
                        Track who's registered for your events
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleExportCSV}
                        variant="outline"
                        size="sm"
                        disabled={filteredAttendees.length === 0}
                    >
                        📥 Export CSV
                    </Button>
                    <Button
                        onClick={() => selectedEventId && fetchAttendees(selectedEventId)}
                        variant="ghost"
                        size="sm"
                    >
                        🔄 Refresh
                    </Button>
                </div>
            </div>

            {/* Event Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Select Event</CardTitle>
                </CardHeader>
                <CardContent>
                    <select
                        value={selectedEventId || ''}
                        onChange={(e) => setSelectedEventId(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="" disabled>Select an event...</option>
                        {events.map(event => (
                            <option key={event.id} value={event.id}>
                                {event.title} - {formatDate(event.date)}
                            </option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            {selectedEventId && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                    <Card className="bg-green-500/5 border-green-500/20">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.going}</div>
                            <div className="text-sm text-muted-foreground">✅ Going</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-yellow-500/5 border-yellow-500/20">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-yellow-600">{stats.maybe}</div>
                            <div className="text-sm text-muted-foreground">🤔 Maybe</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-500/5 border-red-500/20">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-red-600">{stats.no}</div>
                            <div className="text-sm text-muted-foreground">❌ No</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-sm text-muted-foreground">Total Responses</div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Filters */}
            {selectedEventId && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                type="text"
                                placeholder="🔍 Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1"
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="all">All Statuses</option>
                                <option value="going">✅ Going</option>
                                <option value="maybe">🤔 Maybe</option>
                                <option value="no">❌ No</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Attendees Table */}
            {selectedEventId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Attendees {filteredAttendees.length > 0 && `(${filteredAttendees.length})`}
                        </CardTitle>
                        {eventDetails && (
                            <CardDescription>
                                {eventDetails.title} • {formatDate(eventDetails.date)} • {eventDetails.location}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        {loadingAttendees ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin text-3xl">⏳</div>
                            </div>
                        ) : filteredAttendees.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <div className="text-4xl mb-2">📭</div>
                                <p>No attendees found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Name</th>
                                            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Email</th>
                                            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                                            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">RSVP Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAttendees.map((attendee, index) => (
                                            <motion.tr
                                                key={attendee.rsvp_id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                className="border-b border-border/50 hover:bg-muted/50"
                                            >
                                                <td className="py-3 px-2">
                                                    <div className="flex items-center gap-2">
                                                        {attendee.avatar_url ? (
                                                            <img
                                                                src={attendee.avatar_url}
                                                                alt=""
                                                                className="w-8 h-8 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                                                {attendee.display_name?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-medium">{attendee.display_name || 'Unknown'}</div>
                                                            {attendee.role && (
                                                                <div className="text-xs text-muted-foreground">{attendee.role}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="text-sm">{attendee.email || 'N/A'}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    {getStatusBadge(attendee.rsvp_status)}
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatDateTime(attendee.rsvp_created_at)}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
