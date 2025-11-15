import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile, getProfile, validateProfileCompletion } from '../services/profileApi';
import AIProfileBuilder from './ResumeUpload'; // Component renamed to AIProfileBuilder

/**
 * OnboardingFlow Component
 * Multi-step onboarding process for new users
 */
export function OnboardingFlow({ user, walletAddress, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeValidated, setInviteCodeValidated] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    tagline: '',
    bio: '',
    location: '',
    website: '',
    github_username: '',
    twitter_username: '',
    linkedin_url: '',
    discord_username: '',
    skills: [],
    interests: []
  });
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if invite-only mode is enabled and load pending invite code from QR scan
  useEffect(() => {
    const checkInviteOnly = async () => {
      try {
        // Check if there's a pending invite code from QR scan
        const pendingCode = localStorage.getItem('pendingInviteCode');

        if (pendingCode) {
          console.log('✅ Found pending invite code from QR scan:', pendingCode);
          setInviteCode(pendingCode);
          setInviteCodeValidated(true); // Pre-validate since it came from QR
          // Don't clear it yet - clear after onboarding is complete
        }

        const response = await fetch('/api/platform-settings?key=invite_only');
        const data = await response.json();
        if (data.success && data.setting) {
          const isInviteOnly = data.setting.setting_value === 'true';

          // If we have a pending invite code, always show the invite step
          // even if invite-only is disabled (to redeem the code)
          if (pendingCode) {
            setInviteOnly(true);
          } else {
            setInviteOnly(isInviteOnly);
          }
        }
      } catch (err) {
        console.error('Failed to check invite-only status:', err);
      }
    };
    checkInviteOnly();
  }, []);

  // Load existing profile data if available
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getProfile(walletAddress);
        if (profile) {
          setFormData({
            name: profile.name || user?.name || '',
            username: profile.username || user?.email?.split('@')[0] || '',
            tagline: profile.tagline || '',
            bio: profile.bio || '',
            location: profile.location || '',
            website: profile.website || '',
            github_username: profile.github_username || '',
            twitter_username: profile.twitter_username || '',
            linkedin_url: profile.linkedin_url || '',
            discord_username: profile.discord_username || '',
            skills: profile.skills ? JSON.parse(profile.skills) : [],
            interests: profile.interests ? JSON.parse(profile.interests) : []
          });
        } else {
          // Pre-fill name and username from user object if no profile exists
          setFormData(prev => ({
            ...prev,
            name: user?.name || '',
            username: user?.email?.split('@')[0] || ''
          }));
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };

    if (walletAddress) {
      loadProfile();
    }
  }, [walletAddress, user]);

  const steps = [
    ...(inviteOnly ? [{
      id: 'invite',
      title: 'Invite Code Required',
      description: 'This platform is invite-only. Please enter your invite code to continue.',
      icon: '🔑'
    }] : []),
    {
      id: 'welcome',
      title: 'Welcome to Mitobyte!',
      description: 'Let\'s set up your profile so the community can get to know you',
      icon: '👋'
    },
    {
      id: 'resume',
      title: 'Tell Us About Yourself',
      description: 'Let AI create your profile from your description (optional)',
      icon: '✨'
    },
    {
      id: 'basic',
      title: 'Tell us about yourself',
      description: 'Basic information to help others connect with you',
      icon: '👤',
      fields: ['name', 'username', 'tagline', 'bio', 'location']
    },
    {
      id: 'skills',
      title: 'Your Skills & Interests',
      description: 'What are you passionate about? What do you bring to the community?',
      icon: '💡',
      fields: ['skills', 'interests']
    },
    {
      id: 'social',
      title: 'Connect Your Socials',
      description: 'Link your social profiles (optional but recommended)',
      icon: '🔗',
      fields: ['github_username', 'twitter_username', 'linkedin_url', 'discord_username', 'website']
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Your profile is complete. Welcome to the Milwaukee tech community!',
      icon: '🎉'
    }
  ];

  const currentStepData = steps[currentStep];
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addInterest = () => {
    if (interestInput.trim() && !formData.interests.includes(interestInput.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interestInput.trim()]
      }));
      setInterestInput('');
    }
  };

  const removeInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const handleResumeExtracted = (extractedData) => {
    console.log('OnboardingFlow: handleResumeExtracted called with:', extractedData);

    // Merge extracted data with current form data, only updating fields that have values
    const updatedData = {
      ...formData,
      ...(extractedData.name && { name: extractedData.name }),
      ...(extractedData.email && { email: extractedData.email }),
      ...(extractedData.location && { location: extractedData.location }),
      ...(extractedData.website && { website: extractedData.website }),
      ...(extractedData.bio && { bio: extractedData.bio }),
      ...(extractedData.tagline && { tagline: extractedData.tagline }),
      ...(extractedData.github_username && { github_username: extractedData.github_username }),
      ...(extractedData.linkedin_url && { linkedin_url: extractedData.linkedin_url }),
      ...(extractedData.twitter_username && { twitter_username: extractedData.twitter_username }),
      skills: extractedData.skills && extractedData.skills.length > 0
        ? [...new Set([...formData.skills, ...extractedData.skills])]
        : formData.skills,
      interests: extractedData.interests && extractedData.interests.length > 0
        ? [...new Set([...formData.interests, ...extractedData.interests])]
        : formData.interests
    };

    console.log('OnboardingFlow: Updated form data:', updatedData);
    setFormData(updatedData);

    // Auto-advance to next step
    handleNext();
  };

  const handleSkipResume = () => {
    handleNext();
  };

  const validateCurrentStep = () => {
    if (currentStepData.id === 'invite') {
      return inviteCode.trim().length >= 8;
    }
    if (currentStepData.id === 'basic') {
      return formData.name.trim() && formData.username.trim() && formData.tagline.trim() && formData.bio.trim() && formData.location.trim();
    }
    if (currentStepData.id === 'skills') {
      return formData.skills.length > 0 && formData.interests.length > 0;
    }
    return true; // Welcome, social, and complete steps don't require validation
  };

  const handleNext = async () => {
    setError(null);

    // Validate and use invite code if on invite step
    if (currentStepData.id === 'invite') {
      try {
        setLoading(true);

        // Validate code
        const validateResponse = await fetch(`/api/invite-codes?code=${encodeURIComponent(inviteCode.trim())}`);
        const validateData = await validateResponse.json();

        if (!validateData.success || !validateData.valid) {
          setError(validateData.error || 'Invalid invite code');
          setLoading(false);
          return;
        }

        // Use the code
        const useResponse = await fetch('/api/invite-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'use',
            code: inviteCode.trim(),
            walletAddress
          })
        });

        const useData = await useResponse.json();

        if (!useData.success) {
          setError(useData.error || 'Failed to validate invite code');
          setLoading(false);
          return;
        }

        setInviteCodeValidated(true);
        setLoading(false);
      } catch (err) {
        console.error('Failed to validate invite code:', err);
        setError('Failed to validate invite code. Please try again.');
        setLoading(false);
        return;
      }
    }

    // Save progress to database
    if (currentStepData.fields) {
      try {
        setLoading(true);
        const dataToSave = {
          ...formData,
          skills: JSON.stringify(formData.skills),
          interests: JSON.stringify(formData.interests)
        };

        await updateProfile(walletAddress, dataToSave, false);
      } catch (err) {
        console.error('Failed to save progress:', err);
        setError('Failed to save your progress. Please try again.');
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    // Move to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      setError(null);

      // Final save with completion flag
      const dataToSave = {
        ...formData,
        skills: JSON.stringify(formData.skills),
        interests: JSON.stringify(formData.interests)
      };

      await updateProfile(walletAddress, dataToSave, true);
      console.log('✅ Profile saved to database');

      // Redeem invite code if present
      const pendingCode = localStorage.getItem('pendingInviteCode');
      if (pendingCode && inviteCodeValidated) {
        try {
          console.log('🎟️ Redeeming invite code:', pendingCode);
          const userEmail = user?.email || null;
          const userWallet = walletAddress;

          const response = await fetch(`/api/invites/${pendingCode}/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail,
              userWallet
            })
          });

          const data = await response.json();
          if (data.success) {
            console.log('✅ Invite code redeemed successfully');
          } else {
            console.warn('⚠️ Invite redemption failed:', data.error);
          }
        } catch (err) {
          console.error('❌ Failed to redeem invite code:', err);
          // Don't fail onboarding if redemption fails
        } finally {
          // Clear the pending invite code regardless of success/failure
          localStorage.removeItem('pendingInviteCode');
        }
      }

      // Call onComplete callback
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setError('Failed to complete your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = validateCurrentStep();

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-card rounded-2xl sm:rounded-3xl shadow-2xl border border-border/40 overflow-hidden my-auto">
        {/* Progress Bar */}
        <div className="h-1.5 sm:h-2 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-8 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step Header */}
              <div className="text-center mb-4 sm:mb-6 md:mb-8">
                <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">{currentStepData.icon}</div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 px-2">{currentStepData.title}</h2>
                <p className="text-sm sm:text-base text-muted-foreground px-2">{currentStepData.description}</p>
                <div className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Step {currentStep + 1} of {totalSteps}
                </div>
              </div>

              {/* Step Content */}
              <div className="space-y-4 sm:space-y-6">
                {currentStepData.id === 'invite' && (
                  <div className="space-y-4">
                    <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-center">
                        🔒 This platform requires an invite code to register.
                        Please enter the code you received to continue.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Invite Code
                      </label>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX"
                        maxLength={10}
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background text-lg font-mono tracking-wider text-center uppercase"
                        autoFocus
                      />
                    </div>
                    {error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}
                  </div>
                )}

                {currentStepData.id === 'welcome' && (
                  <div className="text-center space-y-3 sm:space-y-4 py-4 sm:py-6 md:py-8">
                    <p className="text-base sm:text-lg px-2">Milwaukee's premier tech community platform</p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 max-w-md mx-auto mt-4 sm:mt-8">
                      <div className="p-3 sm:p-4 bg-primary/10 rounded-lg">
                        <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🤝</div>
                        <div className="text-xs sm:text-sm font-medium">Network</div>
                      </div>
                      <div className="p-3 sm:p-4 bg-primary/10 rounded-lg">
                        <div className="text-xl sm:text-2xl mb-1 sm:mb-2">📅</div>
                        <div className="text-xs sm:text-sm font-medium">Events</div>
                      </div>
                      <div className="p-3 sm:p-4 bg-primary/10 rounded-lg">
                        <div className="text-xl sm:text-2xl mb-1 sm:mb-2">💡</div>
                        <div className="text-xs sm:text-sm font-medium">Collaborate</div>
                      </div>
                      <div className="p-3 sm:p-4 bg-primary/10 rounded-lg">
                        <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🏆</div>
                        <div className="text-xs sm:text-sm font-medium">Grow</div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStepData.id === 'resume' && (
                  <div className="py-4">
                    <AIProfileBuilder
                      onExtracted={handleResumeExtracted}
                      onSkip={handleSkipResume}
                    />
                  </div>
                )}

                {currentStepData.id === 'basic' && (
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                        Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g., John Doe"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={50}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Your full name or display name
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                        Username <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="e.g., johndoe123"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={30}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Lowercase letters, numbers, and underscores only
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                        Tagline <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.tagline}
                        onChange={(e) => handleInputChange('tagline', e.target.value)}
                        placeholder="e.g., Full-stack developer"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={100}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {formData.tagline.length}/100 characters
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                        Bio <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={3}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        maxLength={500}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {formData.bio.length}/500 characters
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                        Location <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="e.g., Milwaukee, WI"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}

                {currentStepData.id === 'skills' && (
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                        Skills <span className="text-destructive">*</span>
                        <span className="text-muted-foreground font-normal ml-1 sm:ml-2 text-xs sm:text-sm">(Add at least one)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                          placeholder="e.g., React, Python"
                          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          onClick={addSkill}
                          className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                          >
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="hover:text-destructive transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                        Interests <span className="text-destructive">*</span>
                        <span className="text-muted-foreground font-normal ml-1 sm:ml-2 text-xs sm:text-sm">(Add at least one)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={interestInput}
                          onChange={(e) => setInterestInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                          placeholder="e.g., AI/ML, Blockchain"
                          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          onClick={addInterest}
                          className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.interests.map((interest) => (
                          <span
                            key={interest}
                            className="px-3 py-1.5 bg-secondary/10 text-secondary-foreground rounded-full text-sm flex items-center gap-2"
                          >
                            {interest}
                            <button
                              onClick={() => removeInterest(interest)}
                              className="hover:text-destructive transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {currentStepData.id === 'social' && (
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                      Connect your social profiles (optional)
                    </p>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">GitHub Username</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">github.com/</span>
                        <input
                          type="text"
                          value={formData.github_username}
                          onChange={(e) => handleInputChange('github_username', e.target.value)}
                          placeholder="username"
                          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Twitter/X Username</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base text-muted-foreground">@</span>
                        <input
                          type="text"
                          value={formData.twitter_username}
                          onChange={(e) => handleInputChange('twitter_username', e.target.value)}
                          placeholder="username"
                          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">LinkedIn URL</label>
                      <input
                        type="url"
                        value={formData.linkedin_url}
                        onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Discord Username</label>
                      <input
                        type="text"
                        value={formData.discord_username}
                        onChange={(e) => handleInputChange('discord_username', e.target.value)}
                        placeholder="username#1234"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}

                {currentStepData.id === 'complete' && (
                  <div className="text-center space-y-6 py-8">
                    <div className="text-6xl animate-bounce">🎉</div>
                    <div className="space-y-3">
                      <p className="text-lg font-medium">Your profile is complete!</p>
                      <p className="text-muted-foreground">
                        You're now part of Milwaukee's vibrant tech community. Start exploring events, connecting with developers, and building amazing things together!
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-8">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl mb-2">📅</div>
                        <div className="text-xs">Attend Events</div>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl mb-2">💬</div>
                        <div className="text-xs">Join Discussions</div>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl mb-2">🤝</div>
                        <div className="text-xs">Make Connections</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Navigation Buttons - Hide for resume step as it has its own buttons */}
              {currentStepData.id !== 'resume' && (
                <div className="flex gap-2 sm:gap-3 mt-6 sm:mt-8">
                  {currentStep > 0 && currentStep < steps.length - 1 && (
                    <button
                      onClick={handleBack}
                      disabled={loading}
                      className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      Back
                    </button>
                  )}

                  <button
                    onClick={currentStep === steps.length - 1 ? handleComplete : handleNext}
                    disabled={(currentStep !== steps.length - 1 && !canProceed) || loading}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                        <span className="hidden sm:inline">{currentStep === steps.length - 1 ? 'Completing...' : 'Saving...'}</span>
                      </span>
                    ) : currentStep === steps.length - 1 ? (
                      'Get Started'
                    ) : currentStep === 0 ? (
                      <span><span className="hidden sm:inline">Start Building Your </span>Profile</span>
                    ) : (
                      'Continue'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
