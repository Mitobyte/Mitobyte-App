import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ProjectSubmissionModal } from './ProjectSubmissionModal';

/**
 * ProjectsList Component
 * Displays submitted hackathon projects
 * Shows submit button only on the day of the event
 */
export function ProjectsList({ event, user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isEventDay, setIsEventDay] = useState(false);
  const [userHasSubmitted, setUserHasSubmitted] = useState(false);

  useEffect(() => {
    checkEventDay();
    fetchProjects();
  }, [event.id]);

  const checkEventDay = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(event.date + 'T00:00:00');
    eventDate.setHours(0, 0, 0, 0);

    // Allow submissions on event day and the day after (for late submissions)
    const dayAfter = new Date(eventDate);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const isToday = today >= eventDate && today <= dayAfter;
    setIsEventDay(isToday);
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hackathon-submissions?eventId=${event.id}`);
      const data = await response.json();

      if (response.ok) {
        setProjects(data.submissions || []);

        // Check if current user has submitted
        if (user) {
          const userIdentifier = user.walletAddress || user.email;
          const userSubmission = data.submissions?.find(s => {
            // Check if user submitted individually or as part of a team
            if (s.userWalletHash === userIdentifier) return true;
            if (s.isTeamSubmission && s.teamMembers) {
              return s.teamMembers.some(m => m.email === userIdentifier);
            }
            return false;
          });
          setUserHasSubmitted(!!userSubmission);
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionSuccess = () => {
    fetchProjects();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Submit Button */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Submitted Projects</h3>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? 's' : ''} submitted
          </p>
        </div>

        {isEventDay && user && !userHasSubmitted && (
          <Button
            onClick={() => setShowSubmitModal(true)}
            size="sm"
            className="gap-1 shrink-0"
          >
            <span>🚀</span>
            Submit Project
          </Button>
        )}

        {!isEventDay && user && (
          <Badge variant="outline" className="text-xs">
            Submissions open on event day
          </Badge>
        )}
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <div className="text-4xl mb-2">🏗️</div>
          <p className="text-muted-foreground">
            {isEventDay
              ? 'No projects submitted yet. Be the first!'
              : 'Projects will appear here when the hackathon begins'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              {/* Project Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-1">{project.projectTitle}</h4>
                  {project.isTeamSubmission && (
                    <Badge variant="secondary" className="text-xs">
                      Team: {project.teamName}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Project Description */}
              <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                {project.projectDescription}
              </p>

              {/* Links */}
              <div className="flex flex-wrap gap-2 mb-3">
                {project.projectUrl && (
                  <a
                    href={project.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    🔗 Live Demo
                  </a>
                )}
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                  >
                    💻 GitHub
                  </a>
                )}
                {project.demoVideoUrl && (
                  <a
                    href={project.demoVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  >
                    🎥 Video
                  </a>
                )}
              </div>

              {/* Team Members */}
              {project.isTeamSubmission && project.teamMembers.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Team Members:</div>
                  <div className="flex flex-wrap gap-2">
                    {project.teamMembers.map((member, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted"
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-[10px] font-bold">
                          {(member.displayName || 'A')[0].toUpperCase()}
                        </div>
                        <span>{member.displayName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted By */}
              <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                Submitted by {project.submittedBy} •{' '}
                {new Date(project.submittedAt).toLocaleDateString()}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Submission Modal */}
      {showSubmitModal && (
        <ProjectSubmissionModal
          event={event}
          user={user}
          onClose={() => setShowSubmitModal(false)}
          onSuccess={handleSubmissionSuccess}
        />
      )}
    </div>
  );
}
