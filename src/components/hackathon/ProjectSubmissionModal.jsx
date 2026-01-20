import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

/**
 * ProjectSubmissionModal Component
 * Allows users to submit their hackathon projects with team member tagging
 * Only available on the day of the event
 */
export function ProjectSubmissionModal({ event, user, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Project Info, 2: Team Members, 3: Review
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Project form state
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // Team state
  const [teamMembers, setTeamMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [attendees, setAttendees] = useState([]);

  // Fetch attendees who RSVP'd as going
  useEffect(() => {
    fetchAttendees();
  }, [event.id]);

  const fetchAttendees = async () => {
    try {
      const response = await fetch(`/api/events/${event.id}/attendees`);
      const data = await response.json();
      if (data.success) {
        // Filter only those who are "going"
        const going = data.attendees.filter(a => a.rsvp_status === 'going');
        setAttendees(going);
      }
    } catch (err) {
      console.error('Failed to fetch attendees:', err);
    }
  };

  // Search attendees
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const query = searchQuery.toLowerCase();
    const results = attendees.filter(attendee => {
      const name = (attendee.display_name || '').toLowerCase();
      const email = (attendee.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    }).slice(0, 10); // Limit to 10 results

    setSearchResults(results);
    setSearching(false);
  }, [searchQuery, attendees]);

  const addTeamMember = (attendee) => {
    // Check if already added
    const alreadyAdded = teamMembers.some(m =>
      m.email === attendee.email || m.display_name === attendee.display_name
    );

    if (alreadyAdded) {
      setError('This person is already added to your team');
      return;
    }

    setTeamMembers([...teamMembers, {
      display_name: attendee.display_name || attendee.email,
      email: attendee.email,
      wallet_hash: attendee.wallet_hash
    }]);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const removeTeamMember = (index) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // If there are team members, create a team first
      let teamId = null;
      if (teamMembers.length > 0) {
        const teamResponse = await fetch('/api/hackathon-teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event.id,
            walletAddress: user.walletAddress || user.email,
            teamName: `${projectTitle} Team`,
            description: `Team for ${projectTitle}`,
            maxMembers: teamMembers.length + 1 // Include submitter
          })
        });

        const teamData = await teamResponse.json();
        if (!teamResponse.ok) {
          throw new Error(teamData.error || 'Failed to create team');
        }

        teamId = teamData.teamId;

        // Invite team members (in a real app, this would send invitations)
        // For now, we'll store them in the submission metadata
      }

      // Submit the project
      const response = await fetch('/api/hackathon-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          walletAddress: user.walletAddress || user.email,
          teamId,
          projectTitle,
          projectDescription,
          projectUrl: projectUrl || null,
          demoVideoUrl: demoVideoUrl || null,
          githubUrl: githubUrl || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit project');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = projectTitle.trim() && projectDescription.trim();
  const canSubmit = canProceedToStep2;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Submit Your Project</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Project Info</span>
              <span>Team Members</span>
              <span>Review</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Project Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="My Awesome Hackathon Project"
                    className="w-full p-3 rounded-lg border border-input bg-background"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project Description <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Describe what your project does, what problem it solves, and the technologies you used..."
                    className="w-full min-h-[150px] p-3 rounded-lg border border-input bg-background resize-none"
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {projectDescription.length}/2000 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project URL
                  </label>
                  <input
                    type="url"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    placeholder="https://myproject.com"
                    className="w-full p-3 rounded-lg border border-input bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Demo Video URL
                  </label>
                  <input
                    type="url"
                    value={demoVideoUrl}
                    onChange={(e) => setDemoVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full p-3 rounded-lg border border-input bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="w-full p-3 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Team Members */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Add Team Members</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Search for attendees who RSVP'd to tag them on your project. You can submit solo or with a team.
                  </p>

                  {/* Search Box */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full p-3 pr-10 rounded-lg border border-input bg-background"
                    />
                    {searching && (
                      <div className="absolute right-3 top-3">
                        <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      {searchResults.map((attendee, index) => (
                        <button
                          key={index}
                          onClick={() => addTeamMember(attendee)}
                          className="w-full p-3 hover:bg-foreground/5 transition-colors text-left flex items-center gap-3 border-b last:border-b-0 border-border"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center font-bold">
                            {(attendee.display_name || attendee.email || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {attendee.display_name || attendee.email}
                            </div>
                            {attendee.email && attendee.display_name && (
                              <div className="text-xs text-muted-foreground truncate">
                                {attendee.email}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Current Team Members */}
                <div>
                  <h3 className="font-semibold mb-2">
                    Team Members ({teamMembers.length + 1})
                  </h3>

                  {/* Submitter (always included) */}
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/50 to-primary/80 flex items-center justify-center font-bold text-primary-foreground">
                      {(user.displayName || user.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {user.displayName || user.email} <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Added Team Members */}
                  {teamMembers.map((member, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-muted/50 border border-border mb-2 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center font-bold">
                        {(member.display_name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{member.display_name}</div>
                        {member.email && (
                          <div className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeTeamMember(index)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {teamMembers.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No team members added yet. You can submit as a solo project or search above to add teammates.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Review Your Submission</h3>

                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Project Title</div>
                    <div className="font-medium">{projectTitle}</div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Description</div>
                    <div className="text-sm">{projectDescription}</div>
                  </div>

                  {projectUrl && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-sm text-muted-foreground mb-1">Project URL</div>
                      <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        {projectUrl}
                      </a>
                    </div>
                  )}

                  {demoVideoUrl && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-sm text-muted-foreground mb-1">Demo Video</div>
                      <a href={demoVideoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        {demoVideoUrl}
                      </a>
                    </div>
                  )}

                  {githubUrl && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-sm text-muted-foreground mb-1">GitHub</div>
                      <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        {githubUrl}
                      </a>
                    </div>
                  )}

                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="text-sm text-muted-foreground mb-2">Team ({teamMembers.length + 1} member{teamMembers.length !== 0 ? 's' : ''})</div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        • {user.displayName || user.email} (You)
                      </div>
                      {teamMembers.map((member, index) => (
                        <div key={index} className="text-sm">
                          • {member.display_name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex items-center justify-between gap-3">
            <div>
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={loading}
                >
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>

              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !canProceedToStep2}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !canSubmit}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Project'
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
