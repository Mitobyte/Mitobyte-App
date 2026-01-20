import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@crossmint/client-sdk-react-ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';

export default function CheckInConfirmation({ checkInCode, userWalletHash }) {
  const { login, user, status: authStatus } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [error, setError] = useState(null);

  // Raw standup responses
  const [workingOn, setWorkingOn] = useState('');
  const [canHelpWith, setCanHelpWith] = useState('');
  const [needHelpWith, setNeedHelpWith] = useState('');

  // Preview/edit state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [standupPreview, setStandupPreview] = useState(null);

  // Editable cleaned responses
  const [editedWorkingOn, setEditedWorkingOn] = useState('');
  const [editedCanHelpWith, setEditedCanHelpWith] = useState('');
  const [editedNeedHelpWith, setEditedNeedHelpWith] = useState('');

  // Check if event requires stand-up
  const requiresStandUp = event?.event_type === 'code_and_coffee' || event?.event_type === 'code_and_brews';

  useEffect(() => {
    fetchEventDetails();
  }, [checkInCode]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/checkin?code=${checkInCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch event details');
      }

      setEvent(data.event);
    } catch (err) {
      console.error('Error fetching event:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessStandup = async (e) => {
    e.preventDefault();

    if (!workingOn.trim() || !canHelpWith.trim()) {
      setError('Please answer the required stand-up questions');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/checkin/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workingOn,
          canHelpWith,
          needHelpWith: needHelpWith.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process standup responses');
      }

      // Set preview data
      setStandupPreview(data.preview);
      setEditedWorkingOn(data.preview.workingOn);
      setEditedCanHelpWith(data.preview.canHelpWith);
      setEditedNeedHelpWith(data.preview.needHelpWith || '');

      // Show preview/edit form
      setShowPreview(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckIn = async () => {
    if (!userWalletHash) {
      setError('Please connect your wallet to check in');
      return;
    }

    try {
      setCheckingIn(true);
      setError(null);

      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      };

      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkInCode,
          userWalletHash,
          deviceInfo: JSON.stringify(deviceInfo),
          workingOn: requiresStandUp ? editedWorkingOn : null,
          canHelpWith: requiresStandUp ? editedCanHelpWith : null,
          needHelpWith: requiresStandUp ? (editedNeedHelpWith || null) : null,
          rawWorkingOn: requiresStandUp ? workingOn : null,
          rawCanHelpWith: requiresStandUp ? canHelpWith : null,
          rawNeedHelpWith: requiresStandUp ? (needHelpWith || null) : null,
          isProcessed: requiresStandUp ? showPreview : false
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.alreadyCheckedIn) {
          setCheckedIn(true);
          setError('You have already checked in to this event');
        } else {
          throw new Error(data.error || 'Failed to check in');
        }
      } else {
        setCheckedIn(true);
      }
    } catch (err) {
      console.error('Error checking in:', err);
      setError(err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setStandupPreview(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading event details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!userWalletHash && authStatus !== 'loading' && event) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader>
              <CardTitle>Sign In to Check In</CardTitle>
              <CardDescription>
                Please sign in to confirm your attendance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Event Preview */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-lg">{event.title}</h3>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                <div className="flex items-center gap-4 text-sm pt-2 border-t">
                  <span>📅 {event.date}</span>
                  <span>🕐 {event.time}</span>
                </div>
                <div className="text-sm">
                  📍 {event.location}
                </div>
              </div>

              {/* Login Button */}
              <Button
                onClick={() => login()}
                className="w-full"
                size="lg"
                disabled={authStatus === 'loading'}
              >
                {authStatus === 'loading' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>🔐 Sign In to Continue</>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                You'll be able to check in after signing in with your email or wallet
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (checkedIn && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-primary/50 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
                  className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center"
                >
                  <svg
                    className="w-10 h-10 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>

                <div>
                  <h2 className="text-2xl font-bold text-primary">Successfully Checked In!</h2>
                  <p className="text-muted-foreground mt-2">
                    Welcome to {event.title}
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Event:</span>
                    <span className="font-semibold">{event.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-semibold">{event.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-semibold">{event.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-semibold">{event.location}</span>
                  </div>
                </div>

                <Button
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check In to Event</CardTitle>
          <CardDescription>
            Confirm your attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {event && (
            <>
              <div className="space-y-3 bg-muted rounded-lg p-4">
                <div>
                  <h3 className="font-bold text-lg">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-semibold">{event.date}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="font-semibold">{event.time}</p>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-semibold">{event.location}</p>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-semibold capitalize">{event.event_type?.replace('_', ' ')}</p>
                </div>

                {event.checkInCount !== undefined && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Checked in:</span>
                    <span className="font-semibold">
                      {event.checkInCount}
                      {event.spotsRemaining !== null && ` / ${event.capacity}`}
                    </span>
                  </div>
                )}

                {event.spotsRemaining !== null && event.spotsRemaining <= 0 && (
                  <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                    ⚠️ Event is at capacity
                  </div>
                )}
              </div>

              {/* Stand-up Form for Code and Coffee / Code and Brews */}
              {requiresStandUp && !showPreview && (
                <form onSubmit={handleProcessStandup} className="space-y-4 bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <span>💬</span>
                      <span>Share Your Stand-up</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      ✨ AI will clean up your responses and check for appropriate content
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor="workingOn" className="block text-sm font-medium mb-2">
                        What are you working on today? <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        id="workingOn"
                        value={workingOn}
                        onChange={(e) => setWorkingOn(e.target.value)}
                        placeholder="e.g., Building a React app, learning TypeScript, debugging API..."
                        className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={500}
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {workingOn.length}/500 characters
                      </p>
                    </div>

                    <div>
                      <label htmlFor="canHelpWith" className="block text-sm font-medium mb-2">
                        What can you help others with? <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        id="canHelpWith"
                        value={canHelpWith}
                        onChange={(e) => setCanHelpWith(e.target.value)}
                        placeholder="e.g., React best practices, debugging, code review..."
                        className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={500}
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {canHelpWith.length}/500 characters
                      </p>
                    </div>

                    <div>
                      <label htmlFor="needHelpWith" className="block text-sm font-medium mb-2">
                        What do you need help with? <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <textarea
                        id="needHelpWith"
                        value={needHelpWith}
                        onChange={(e) => setNeedHelpWith(e.target.value)}
                        placeholder="e.g., Understanding async/await, optimizing database queries..."
                        className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={500}
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {needHelpWith.length}/500 characters
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isProcessing || !workingOn.trim() || !canHelpWith.trim()}
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing with AI...
                      </>
                    ) : (
                      '✨ Process with AI & Preview'
                    )}
                  </Button>
                </form>
              )}

              {/* Preview/Edit Form for Stand-up Responses */}
              {requiresStandUp && showPreview && standupPreview && (
                <div className="space-y-4 bg-purple-500/5 rounded-lg p-4 border border-purple-500/30">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <span>✏️</span>
                      <span>Review & Edit Your Stand-up</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      AI has cleaned up your responses. Review and edit before checking in.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        What are you working on today?
                      </label>
                      <textarea
                        value={editedWorkingOn}
                        onChange={(e) => setEditedWorkingOn(e.target.value)}
                        className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={500}
                        disabled={checkingIn}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        What can you help others with?
                      </label>
                      <textarea
                        value={editedCanHelpWith}
                        onChange={(e) => setEditedCanHelpWith(e.target.value)}
                        className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={500}
                        disabled={checkingIn}
                      />
                    </div>

                    {editedNeedHelpWith && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          What do you need help with?
                        </label>
                        <textarea
                          value={editedNeedHelpWith}
                          onChange={(e) => setEditedNeedHelpWith(e.target.value)}
                          className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          maxLength={500}
                          disabled={checkingIn}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleCancelPreview}
                      variant="outline"
                      disabled={checkingIn}
                    >
                      ← Back
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {(!requiresStandUp || showPreview) && (
                <Button
                  onClick={handleCheckIn}
                  disabled={checkingIn || checkedIn || (event.spotsRemaining !== null && event.spotsRemaining <= 0) || (requiresStandUp && !showPreview)}
                  className="w-full"
                >
                  {checkingIn ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Checking in...
                    </>
                  ) : (
                    '✅ Check In Now'
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
