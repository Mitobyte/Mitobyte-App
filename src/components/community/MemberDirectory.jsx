import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { MemberCard } from './MemberCard';
import { DirectoryFilters } from './DirectoryFilters';

export function MemberDirectory({ currentUserWallet, currentUserProfile }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSkill, setFilterSkill] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState([]);
  const [aiSearching, setAiSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'connections'
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  // Check if current user has a complete profile
  const isProfileComplete = currentUserProfile &&
    currentUserProfile.display_name &&
    currentUserProfile.bio;

  // Helper to check if a member has a complete profile
  const hasCompleteProfile = (member) =>
    member.display_name && member.bio;

  useEffect(() => {
    fetchMembers();
    if (currentUserWallet) {
      fetchConnections();
    }
  }, [currentUserWallet]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/community/members');
      const data = await response.json();
      if (data.success) {
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    if (!currentUserWallet) return;

    try {
      setConnectionsLoading(true);
      const response = await fetch(`/api/connections?walletAddress=${encodeURIComponent(currentUserWallet)}`);
      const data = await response.json();
      if (data.success) {
        // Fetch full profile data for each connection
        const connectionsWithProfiles = await Promise.all(
          data.connections.map(async (conn) => {
            try {
              const isHash = /^[a-f0-9]{64}$/i.test(conn.walletAddress);
              const queryParam = isHash ? 'walletHash' : 'walletAddress';
              const profileResponse = await fetch(`/api/profile?${queryParam}=${encodeURIComponent(conn.walletAddress)}`);
              const profileData = await profileResponse.json();
              if (profileData.success) {
                return { ...conn, ...profileData.profile };
              }
              return conn;
            } catch (error) {
              console.error('Failed to fetch profile for connection:', error);
              return conn;
            }
          })
        );
        setConnections(connectionsWithProfiles);
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }

    setAiSearching(true);
    setAiSearchMode(true);

    try {
      const response = await fetch('/api/community/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiSearchQuery })
      });

      const data = await response.json();

      if (data.success) {
        setAiSearchResults(data.members || []);
      } else {
        alert('AI search failed: ' + (data.error || 'Unknown error'));
        setAiSearchMode(false);
      }
    } catch (error) {
      console.error('AI search error:', error);
      alert('Failed to perform AI search');
      setAiSearchMode(false);
    } finally {
      setAiSearching(false);
    }
  };

  const clearAiSearch = () => {
    setAiSearchMode(false);
    setAiSearchResults([]);
    setAiSearchQuery('');
  };

  const filteredMembers = (() => {
    // Get the base list based on active tab
    const baseList = activeTab === 'connections' ? connections : members;

    // Filter out members with incomplete profiles first
    const completeProfiles = baseList.filter(hasCompleteProfile);

    // If AI search is active, use AI results
    if (aiSearchMode && aiSearchResults.length > 0) {
      let filtered = aiSearchResults.filter(hasCompleteProfile);

      // Apply skill filter to AI results
      if (filterSkill !== 'all') {
        filtered = filtered.filter(member =>
          member.skills?.toLowerCase().includes(filterSkill.toLowerCase())
        );
      }

      return filtered;
    }

    // Regular filtering
    return completeProfiles.filter(member => {
      const matchesSearch = searchTerm === '' ||
        member.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.tagline?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSkill = filterSkill === 'all' ||
        member.skills?.toLowerCase().includes(filterSkill.toLowerCase());

      return matchesSearch && matchesSkill;
    });
  })();

  return (
    <div className="space-y-4">
      {/* Incomplete Profile Banner */}
      {currentUserWallet && !isProfileComplete && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <span>✨</span>
          <p className="text-foreground/90">
            <strong>Complete your profile</strong> to appear in the Community. Add a display name and bio in your{' '}
            <button
              onClick={() => {
                window.history.pushState({}, '', '/settings');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              Settings
            </button>.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>👥</span>
            Community
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'hover:bg-foreground/5'
                }`}
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'hover:bg-foreground/5'
                }`}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Tabs */}
        {currentUserWallet && (
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 font-medium transition-colors ${activeTab === 'all'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              All Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-4 py-2 font-medium transition-colors ${activeTab === 'connections'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              My Connections ({connections.length})
            </button>
          </div>
        )}

        {/* Privacy notice - Only show if user is logged in */}
        {currentUserWallet && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
            <p className="text-foreground/80">
              🔒 <strong>Privacy Control:</strong> Want to opt out of the directory? Go to your <button onClick={() => {
                window.history.pushState({}, '', '/settings');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }} className="text-primary hover:underline font-medium">Settings</button> and change your Profile Visibility to "Private".
            </p>
          </div>
        )}

        {/* Public view notice */}
        {!currentUserWallet && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm flex items-center justify-between">
            <p className="text-foreground/80">
              👋 <strong>Join the community!</strong> Connect with these developers by creating a profile.
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <DirectoryFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        aiSearchQuery={aiSearchQuery}
        setAiSearchQuery={setAiSearchQuery}
        aiSearchMode={aiSearchMode}
        setAiSearchMode={setAiSearchMode}
        aiSearching={aiSearching}
        handleAiSearch={handleAiSearch}
        clearAiSearch={clearAiSearch}
        filterSkill={filterSkill}
        setFilterSkill={setFilterSkill}
        filteredCount={filteredMembers.length}
        totalCount={members.length}
        aiSearchResultsCount={aiSearchResults.length}
      />

      {/* Members Grid/List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
        </div>
      ) : filteredMembers.length > 0 ? (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-3'
        }>
          {filteredMembers.map((member, index) => (
            <motion.div
              key={member.wallet_hash || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              {/* AI Match Badge */}
              {aiSearchMode && member.relevance_score && (
                <div className="absolute -top-3 -right-3 z-10">
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold shadow-lg">
                    {Math.round(member.relevance_score * 100)}% Match
                  </div>
                </div>
              )}

              <MemberCard
                member={member}
                viewMode={viewMode}
                aiSearchMode={aiSearchMode}
              />

              {/* AI Match Reason */}
              {aiSearchMode && member.match_reason && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mt-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20"
                >
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">Why this matches:</span>{' '}
                    {member.match_reason}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No members found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
