import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import Z_INDEX from '../lib/z-index';
import { MODAL_INSETS } from '../lib/responsive';
import AIProfileBuilder from './AIProfileBuilder'; // Component renamed to AIProfileBuilder

export function ProfileEditModal({ isOpen, onClose, profile, userId, walletAddress, onSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    avatar_url: '',
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
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showProfileBuilder, setShowProfileBuilder] = useState(false);

  // Populate form with existing profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        username: profile.username || '',
        avatar_url: profile.avatar_url || '',
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
    }
  }, [profile]);

  // Check username availability with debounce
  useEffect(() => {
    if (!formData.username || formData.username === profile?.username) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const response = await fetch(`/api/username/check?username=${encodeURIComponent(formData.username)}&userId=${userId}`);
        const data = await response.json();
        setUsernameAvailable(data.available ? true : data.error || false);
      } catch (error) {
        console.error('Username check failed:', error);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, profile?.username, userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleAddInterest = () => {
    if (interestInput.trim() && !formData.interests.includes(interestInput.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interestInput.trim()]
      }));
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const handleResumeExtracted = (extractedData) => {
    // Merge extracted data with current form data
    setFormData(prev => ({
      ...prev,
      ...(extractedData.name && { name: extractedData.name }),
      ...(extractedData.location && { location: extractedData.location }),
      ...(extractedData.website && { website: extractedData.website }),
      ...(extractedData.bio && { bio: extractedData.bio }),
      ...(extractedData.tagline && { tagline: extractedData.tagline }),
      ...(extractedData.github_username && { github_username: extractedData.github_username }),
      ...(extractedData.linkedin_url && { linkedin_url: extractedData.linkedin_url }),
      ...(extractedData.twitter_username && { twitter_username: extractedData.twitter_username })
    }));

    // Merge skills and interests
    if (extractedData.skills && extractedData.skills.length > 0) {
      setFormData(prev => ({
        ...prev,
        skills: [...new Set([...prev.skills, ...extractedData.skills])]
      }));
    }
    if (extractedData.interests && extractedData.interests.length > 0) {
      setFormData(prev => ({
        ...prev,
        interests: [...new Set([...prev.interests, ...extractedData.interests])]
      }));
    }

    // Close the resume upload section
    setShowProfileBuilder(false);
  };

  const handleSave = async () => {
    setError('');

    // Validate username
    if (formData.username && usernameAvailable === false) {
      setError('Username is not available');
      return;
    }

    if (formData.username && typeof usernameAvailable === 'string') {
      setError(usernameAvailable);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          ...formData,
          skills: JSON.stringify(formData.skills),
          interests: JSON.stringify(formData.interests)
        })
      });

      const data = await response.json();
      if (data.success) {
        onSaved?.();
        onClose();
      } else {
        console.error('Profile save failed:', data);
        const errorMsg = data.error || 'Failed to save profile';
        const errorDetails = data.details ? ` - ${data.details.split('\n')[0]}` : '';
        setError(errorMsg + errorDetails);
      }
    } catch (error) {
      console.error('Save profile error:', error);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      setError('Failed to save profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{
              zIndex: Z_INDEX.MODAL_BACKDROP,
              pointerEvents: 'auto'
            }}
          />

          {/* Modal */}
          <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`fixed ${MODAL_INSETS.centered} bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <h2 className="text-xl sm:text-2xl font-bold">Edit Profile</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Resume Upload Section */}
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">Update from Resume</h3>
                <p className="text-xs text-muted-foreground">
                  Let AI auto-fill your profile from your resume
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProfileBuilder(!showProfileBuilder)}
              >
                {showProfileBuilder ? 'Hide' : 'Upload'}
              </Button>
            </div>
            {showProfileBuilder && (
              <div className="mt-4">
                <AIProfileBuilder
                  onExtracted={handleResumeExtracted}
                  onSkip={() => setShowProfileBuilder(false)}
                />
              </div>
            )}
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium mb-2">Avatar URL</label>
            <Input
              name="avatar_url"
              value={formData.avatar_url}
              onChange={handleChange}
              placeholder="https://example.com/avatar.jpg"
              className="w-full"
            />
            {formData.avatar_url && (
              <div className="mt-3 flex justify-center">
                <img
                  src={formData.avatar_url}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-border"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <Input
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="username"
              className="w-full"
            />
            {usernameChecking && (
              <p className="text-xs text-muted-foreground mt-1">Checking availability...</p>
            )}
            {!usernameChecking && usernameAvailable === true && (
              <p className="text-xs text-green-600 mt-1">✓ Username available</p>
            )}
            {!usernameChecking && usernameAvailable === false && (
              <p className="text-xs text-red-600 mt-1">✗ Username taken</p>
            )}
            {!usernameChecking && typeof usernameAvailable === 'string' && (
              <p className="text-xs text-red-600 mt-1">{usernameAvailable}</p>
            )}
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-sm font-medium mb-2">Tagline</label>
            <Input
              name="tagline"
              value={formData.tagline}
              onChange={handleChange}
              placeholder="e.g., Full-stack developer"
              maxLength={100}
              className="w-full"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <Input
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., San Francisco, CA"
              className="w-full"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <Input
              name="website"
              type="url"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://yourwebsite.com"
              className="w-full"
            />
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Social Links</h3>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">GitHub Username</label>
              <Input
                name="github_username"
                value={formData.github_username}
                onChange={handleChange}
                placeholder="username"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Twitter/X Username</label>
              <Input
                name="twitter_username"
                value={formData.twitter_username}
                onChange={handleChange}
                placeholder="username"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">LinkedIn URL</label>
              <Input
                name="linkedin_url"
                type="url"
                value={formData.linkedin_url}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Discord Username</label>
              <Input
                name="discord_username"
                value={formData.discord_username}
                onChange={handleChange}
                placeholder="username#1234"
                className="w-full"
              />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-semibold mb-2">Skills</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Add a skill..."
                className="flex-1"
              />
              <Button onClick={handleAddSkill} type="button">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-2">
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-semibold mb-2">Interests</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                placeholder="Add an interest..."
                className="flex-1"
              />
              <Button onClick={handleAddInterest} type="button">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.interests.map((interest, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full bg-muted text-foreground text-sm flex items-center gap-2">
                  {interest}
                  <button
                    onClick={() => handleRemoveInterest(interest)}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || usernameChecking || usernameAvailable === false}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
