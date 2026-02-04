import { useState, useEffect, useRef } from 'react';
import { Drawer } from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { getEventAttendees } from '../../services/rsvpApi';

export function HackProjectSubmissionForm({ isOpen, onClose, hackathon, user, walletAddress }) {
    const [formData, setFormData] = useState({
        projectName: '',
        tagline: '',
        description: '',
        repoUrl: '',
        demoUrl: '',
        liveUrl: ''
    });

    // Team Member State
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const searchRef = useRef(null);

    // Fetch attendees when drawer opens
    useEffect(() => {
        if (hackathon?.id && isOpen) {
            getEventAttendees(hackathon.id)
                .then(data => {
                    if (data.attendees) {
                        // Filter out current user from available list
                        const others = data.attendees.filter(a =>
                            a.email !== user?.email &&
                            // Try to match somewhat robustly if emails differ slightly or rely on wallet logic not visible here
                            // For now assume email or display name match prevents self-add
                            a.display_name !== user?.display_name
                        );
                        setAvailableUsers(others);
                    }
                })
                .catch(err => console.error("Failed to load potential teammates", err));
        }
    }, [hackathon?.id, isOpen, user]);

    // Close suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddMember = (member) => {
        if (!selectedTeam.find(m => m.email === member.email)) {
            setSelectedTeam([...selectedTeam, member]);
        }
        setMemberSearch('');
        setShowSuggestions(false);
    };

    const handleRemoveMember = (email) => {
        setSelectedTeam(selectedTeam.filter(m => m.email !== email));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Format team members including the lead
            const finalTeam = [
                { email: user.email, display_name: user.display_name || 'You', role: 'Lead' },
                ...selectedTeam.map(m => ({
                    email: m.email,
                    display_name: m.display_name,
                    role: 'Member'
                }))
            ];

            console.log('Submitted project for', hackathon?.title, {
                ...formData,
                team: finalTeam,
                eventId: hackathon?.id,
                userWalletHash: walletAddress
            });

            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setFormData({
                    projectName: '',
                    tagline: '',
                    description: '',
                    repoUrl: '',
                    demoUrl: '',
                    liveUrl: ''
                });
                setSelectedTeam([]);
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Submission failed', error);
            alert('Failed to submit project');
        } finally {
            setSubmitting(false);
        }
    };

    // Filter suggestions
    const filteredSuggestions = availableUsers.filter(u => {
        const search = memberSearch.toLowerCase();
        const name = (u.display_name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return (name.includes(search) || email.includes(search)) &&
            !selectedTeam.find(m => m.email === u.email);
    });

    if (!hackathon) return null;

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={`Submit Project: ${hackathon.title}`}>
            <div className="p-6 max-w-2xl mx-auto pb-20">
                {submitted ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-4xl mb-6">
                            🚀
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Project Submitted!</h3>
                        <p className="text-muted-foreground">
                            Your project has been successfully registered for {hackathon.title}.
                            <br />
                            Get ready to demo!
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Project Details</h3>
                                <p className="text-sm text-muted-foreground">Tell us what you built!</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Project Name *</label>
                                <Input
                                    required
                                    placeholder="e.g. SuperHacker App"
                                    value={formData.projectName}
                                    onChange={e => setFormData({ ...formData, projectName: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tagline *</label>
                                <Input
                                    required
                                    placeholder="Short catchy description (max 100 chars)"
                                    maxLength={100}
                                    value={formData.tagline}
                                    onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description *</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Describe what your project does, tech stack used, challenges faced..."
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Links & Team</h3>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">GitHub Repo URL *</label>
                                <Input
                                    required
                                    type="url"
                                    placeholder="https://github.com/username/project"
                                    value={formData.repoUrl}
                                    onChange={e => setFormData({ ...formData, repoUrl: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Demo Video URL (Optional)</label>
                                <Input
                                    type="url"
                                    placeholder="YouTube / Loom link"
                                    value={formData.demoUrl}
                                    onChange={e => setFormData({ ...formData, demoUrl: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Live Project URL (Optional)</label>
                                <Input
                                    type="url"
                                    placeholder="https://my-project.vercel.app"
                                    value={formData.liveUrl}
                                    onChange={e => setFormData({ ...formData, liveUrl: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2" ref={searchRef}>
                                <label className="text-sm font-medium">Team Members</label>

                                {/* Selected Team Members Tags */}
                                <div className="flex flex-wrap gap-2 mb-2 p-1 min-h-[32px]">
                                    <Badge variant="secondary" className="pl-2 pr-3 py-1 flex items-center gap-1">
                                        <span className="text-xs">👑</span> You
                                    </Badge>

                                    {selectedTeam.map((member) => (
                                        <Badge key={member.email} variant="outline" className="px-2 py-1 flex items-center gap-2 bg-background">
                                            {member.avatar_url ? (
                                                <img src={member.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
                                                    {member.display_name?.[0] || '?'}
                                                </div>
                                            )}
                                            <span>{member.display_name || member.email}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMember(member.email)}
                                                className="ml-1 hover:text-destructive font-bold"
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                                </div>

                                {/* Search Input + Dropdown */}
                                <div className="relative">
                                    <Input
                                        placeholder="Search for teammates by name..."
                                        value={memberSearch}
                                        onChange={e => {
                                            setMemberSearch(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                    />

                                    {showSuggestions && memberSearch && (
                                        <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-50">
                                            {filteredSuggestions.length > 0 ? (
                                                filteredSuggestions.map((user, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => handleAddMember(user)}
                                                        className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-3 transition-colors"
                                                    >
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs">
                                                                {user.display_name?.[0] || user.email?.[0] || '?'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-sm font-medium">{user.display_name || 'Unknown'}</div>
                                                            <div className="text-xs text-muted-foreground">{user.role || 'Hacker'}</div>
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                    No matching attendees found.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Search for people who have RSVP'd to this event.
                                </p>
                            </div>
                        </div>

                        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                            {submitting ? 'Submitting...' : '🚀 Submit Project'}
                        </Button>
                    </form>
                )}
            </div>
        </Drawer>
    );
}
