import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import TagInput from './TagInput';
import ImageUpload from './ImageUpload';
import ProfileQRCode from './ProfileQRCode';
import AIProfileBuilder from './ResumeUpload'; // Component renamed to AIProfileBuilder

export default function ProfileEditPage({ user, walletAddress, onBack }) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    avatar_url: '',
    tagline: '',
    bio: '',
    location: '',
    website: '',
    github_username: '',
    twitter_username: '',
    linkedin_url: '',
    discord_username: ''
  });
  const [skillsTags, setSkillsTags] = useState([]);
  const [interestsTags, setInterestsTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [originalDisplayName, setOriginalDisplayName] = useState('');
  const [showProfileBuilder, setShowProfileBuilder] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [walletAddress]);

  const fetchProfile = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/profile?walletAddress=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();

      if (data.success && data.profile) {
        const displayName = data.profile.display_name || data.profile.email?.split('@')[0] || '';
        setFormData({
          name: data.profile.name || '',
          display_name: displayName,
          avatar_url: data.profile.avatar_url || '',
          tagline: data.profile.tagline || '',
          bio: data.profile.bio || '',
          location: data.profile.location || '',
          website: data.profile.website || '',
          github_username: data.profile.github_username || '',
          twitter_username: data.profile.twitter_username || '',
          linkedin_url: data.profile.linkedin_url || '',
          discord_username: data.profile.discord_username || ''
        });
        setOriginalDisplayName(displayName);

        // Parse JSON arrays for skills and interests
        try {
          if (data.profile.skills) {
            const parsedSkills = JSON.parse(data.profile.skills);
            setSkillsTags(Array.isArray(parsedSkills) ? parsedSkills : []);
          }
        } catch (e) {
          setSkillsTags([]);
        }

        try {
          if (data.profile.interests) {
            const parsedInterests = JSON.parse(data.profile.interests);
            setInterestsTags(Array.isArray(parsedInterests) ? parsedInterests : []);
          }
        } catch (e) {
          setInterestsTags([]);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Check username availability when display_name changes
    if (field === 'display_name' && value.trim() && value !== originalDisplayName) {
      checkUsernameAvailability(value.trim());
    } else if (field === 'display_name' && value === originalDisplayName) {
      setUsernameAvailable(null); // Clear validation if back to original
    }
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}&currentWallet=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();

      setUsernameAvailable(data.available);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleResumeExtracted = (extractedData) => {
    // Merge extracted data with current form data
    setFormData(prev => ({
      ...prev,
      ...(extractedData.name && !prev.display_name && { display_name: extractedData.name }),
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
      setSkillsTags(prev => [...new Set([...prev, ...extractedData.skills])]);
    }
    if (extractedData.interests && extractedData.interests.length > 0) {
      setInterestsTags(prev => [...new Set([...prev, ...extractedData.interests])]);
    }

    // Close the resume upload section
    setShowProfileBuilder(false);

    // Show success message
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Validate display_name
    if (!formData.display_name.trim()) {
      setError('Username is required');
      setSaving(false);
      return;
    }

    if (formData.display_name.trim().length < 3) {
      setError('Username must be at least 3 characters');
      setSaving(false);
      return;
    }

    // Check if username is available (if changed)
    if (formData.display_name !== originalDisplayName && usernameAvailable === false) {
      setError('Username is already taken');
      setSaving(false);
      return;
    }

    try {
      // Convert tags arrays to JSON strings
      const profileData = {
        ...formData,
        skills: skillsTags.length > 0 ? JSON.stringify(skillsTags) : '',
        interests: interestsTags.length > 0 ? JSON.stringify(interestsTags) : ''
      };

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          ...profileData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Profile save failed:', data);
        const errorMsg = data.error || 'Failed to save profile';
        const errorDetails = data.details ? `\n${data.details}` : '';
        throw new Error(errorMsg + errorDetails);
      }

      setSuccess(true);
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      console.error('Error saving profile:', err);
      console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 pb-20">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={saving}
          >
            ← Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Edit Profile</h1>
            <p className="text-sm text-muted-foreground">
              {user?.email || 'Update your community profile'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* AI Profile Builder Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">AI Profile Builder</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Tell us about yourself and let AI create your profile
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProfileBuilder(!showProfileBuilder)}
              >
                {showProfileBuilder ? 'Hide' : 'AI Profile Builder'}
              </Button>
            </div>
          </CardHeader>
          {showProfileBuilder && (
            <CardContent>
              <AIProfileBuilder
                onExtracted={handleResumeExtracted}
                onSkip={() => setShowProfileBuilder(false)}
              />
            </CardContent>
          )}
        </Card>

        {/* Profile Form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Your first and last name"
                  maxLength={60}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This is how your name will appear to other attendees
                </p>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="display_name" className="block text-sm font-medium mb-2">
                  Username <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    placeholder="your-username"
                    minLength={3}
                    maxLength={30}
                    required
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                  />
                  {checkingUsername && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                  )}
                  {!checkingUsername && usernameAvailable !== null && formData.display_name !== originalDisplayName && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameAvailable ? (
                        <span className="text-green-500 text-lg">✓</span>
                      ) : (
                        <span className="text-destructive text-lg">✗</span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.display_name.length}/30 characters
                  {!checkingUsername && usernameAvailable === false && formData.display_name !== originalDisplayName && (
                    <span className="text-destructive ml-2">Username is already taken</span>
                  )}
                  {!checkingUsername && usernameAvailable === true && formData.display_name !== originalDisplayName && (
                    <span className="text-green-500 ml-2">Username is available</span>
                  )}
                </p>
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium mb-3 text-center">
                  Profile Picture
                </label>
                <ImageUpload
                  value={formData.avatar_url}
                  onChange={(value) => handleChange('avatar_url', value)}
                  label="Choose Avatar"
                />
              </div>

              {/* Tagline */}
              <div>
                <label htmlFor="tagline" className="block text-sm font-medium mb-2">
                  Tagline
                </label>
                <input
                  type="text"
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  placeholder="Full-stack developer | AI enthusiast"
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.tagline.length}/100 characters
                </p>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell the community about yourself..."
                  maxLength={500}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.bio.length}/500 characters
                </p>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Milwaukee, WI"
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm font-medium mb-2">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Social Links Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-sm">Social Links</h3>

                {/* GitHub */}
                <div>
                  <label htmlFor="github_username" className="block text-sm font-medium mb-2">
                    GitHub Username
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">github.com/</span>
                    <input
                      type="text"
                      id="github_username"
                      value={formData.github_username}
                      onChange={(e) => handleChange('github_username', e.target.value)}
                      placeholder="username"
                      className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Twitter */}
                <div>
                  <label htmlFor="twitter_username" className="block text-sm font-medium mb-2">
                    Twitter Username
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">@</span>
                    <input
                      type="text"
                      id="twitter_username"
                      value={formData.twitter_username}
                      onChange={(e) => handleChange('twitter_username', e.target.value)}
                      placeholder="username"
                      className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* LinkedIn */}
                <div>
                  <label htmlFor="linkedin_url" className="block text-sm font-medium mb-2">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="url"
                    id="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Discord */}
                <div>
                  <label htmlFor="discord_username" className="block text-sm font-medium mb-2">
                    Discord Username
                  </label>
                  <input
                    type="text"
                    id="discord_username"
                    value={formData.discord_username}
                    onChange={(e) => handleChange('discord_username', e.target.value)}
                    placeholder="username#1234"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Skills & Interests */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-sm">Skills & Interests</h3>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Skills
                  </label>
                  <TagInput
                    tags={skillsTags}
                    onChange={setSkillsTags}
                    placeholder="Add a skill (e.g., JavaScript, React)"
                    maxTags={15}
                  />
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Interests
                  </label>
                  <TagInput
                    tags={interestsTags}
                    onChange={setInterestsTags}
                    placeholder="Add an interest (e.g., AI, Web Development)"
                    maxTags={15}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-primary/10 border border-primary/20 text-primary text-sm p-3 rounded-lg">
                  ✓ Profile saved successfully! Redirecting...
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 sticky bottom-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={saving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* QR Code Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">My Networking QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Show your QR code to other attendees for quick profile sharing at events
            </p>
            <ProfileQRCode walletAddress={walletAddress} profile={formData} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
