import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export function MemberDirectory({ currentUserWallet }) {
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

  const popularSkills = ['All', 'React', 'Python', 'JavaScript', 'TypeScript', 'Node.js', 'AI/ML', 'Backend', 'Frontend', 'Design'];

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

    // If AI search is active, use AI results
    if (aiSearchMode && aiSearchResults.length > 0) {
      let filtered = [...aiSearchResults];

      // Apply skill filter to AI results
      if (filterSkill !== 'all') {
        filtered = filtered.filter(member =>
          member.skills?.toLowerCase().includes(filterSkill.toLowerCase())
        );
      }

      return filtered;
    }

    // Regular filtering
    return baseList.filter(member => {
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
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>👥</span>
            Who's Here?
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'hover:bg-foreground/5'
              }`}
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                viewMode === 'list' ? 'bg-primary/10 text-primary' : 'hover:bg-foreground/5'
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
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'connections'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Connections ({connections.length})
            </button>
          </div>
        )}

        {/* Privacy notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
          <p className="text-foreground/80">
            🔒 <strong>Privacy Control:</strong> Want to opt out of the directory? Go to your <button onClick={() => {
              window.history.pushState({}, '', '/settings');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }} className="text-primary hover:underline font-medium">Settings</button> and change your Profile Visibility to "Private".
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        {/* AI Search Banner */}
        {aiSearchMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-semibold">AI Search Active</p>
                  <p className="text-sm text-muted-foreground">
                    Showing {aiSearchResults.length} AI-matched members for "{aiSearchQuery}"
                  </p>
                </div>
              </div>
              <button
                onClick={clearAiSearch}
                className="px-4 py-2 rounded-full text-sm font-medium border border-border hover:bg-foreground/5 transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}

        {/* Quick search */}
        <Input
          placeholder="🔍 Quick search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* AI Semantic search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="✨ Try: 'React developers', 'designers in Milwaukee', 'backend experts'..."
              value={aiSearchQuery}
              onChange={(e) => {
                setAiSearchQuery(e.target.value);
                if (aiSearchMode) setAiSearchMode(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && aiSearchQuery.trim()) {
                  handleAiSearch();
                }
              }}
              className="border-primary/30"
            />
          </div>
          <button
            onClick={handleAiSearch}
            disabled={aiSearching || !aiSearchQuery.trim()}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {aiSearching ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                Searching...
              </>
            ) : (
              <>
                <span className="mr-2">✨</span>
                AI Search
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Tip: Use natural language like "frontend developers" or "Python experts" for AI-powered discovery
        </p>

        {/* Skill filters */}
        <div className="flex flex-wrap gap-2">
          {popularSkills.map((skill) => (
            <button
              key={skill}
              onClick={() => setFilterSkill(skill === 'All' ? 'all' : skill)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                (skill === 'All' && filterSkill === 'all') || filterSkill === skill
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-foreground/5'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>

        {/* Active filters display */}
        {(searchTerm || aiSearchMode || filterSkill !== 'all') && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing {filteredMembers.length} of {members.length} members</span>
            {(searchTerm || aiSearchMode || filterSkill !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  clearAiSearch();
                  setFilterSkill('all');
                }}
                className="text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

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
            <div key={member.wallet_hash} className="relative">
              {/* AI Match Badge */}
              {aiSearchMode && member.relevance_score && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="absolute -top-3 -right-3 z-10"
                >
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold shadow-lg">
                    {Math.round(member.relevance_score * 100)}% Match
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-card border border-border rounded-xl overflow-hidden transition-all ${
                  viewMode === 'list' ? 'p-4' : ''
                }`}
              >
              {viewMode === 'grid' ? (
                // Grid View - Card Style
                <div className="flex flex-col">
                  {/* Avatar - Large at top */}
                  <div className="aspect-square w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.display_name || 'Member'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center text-6xl font-bold bg-gradient-to-br from-primary/30 to-primary/60 text-primary-foreground"
                      style={{ display: member.avatar_url ? 'none' : 'flex' }}
                    >
                      {(member.display_name || member.email || 'M')[0].toUpperCase()}
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="p-4 space-y-3">
                    {/* Name & Tagline */}
                    <div>
                      <h3 className="font-bold text-lg truncate">
                        {member.display_name || member.email?.split('@')[0] || 'Member'}
                      </h3>
                      {member.tagline && (
                        <p className="text-sm text-muted-foreground italic truncate">
                          {member.tagline}
                        </p>
                      )}
                    </div>

                    {/* Location */}
                    {member.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>📍</span>
                        <span className="truncate">{member.location}</span>
                      </div>
                    )}

                    {/* Bio */}
                    {member.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {member.bio}
                      </p>
                    )}

                    {/* Skills */}
                    {member.skills && (
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(member.skills).slice(0, 4).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {JSON.parse(member.skills).length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{JSON.parse(member.skills).length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Interests */}
                    {member.interests && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Interests:</span> {JSON.parse(member.interests).slice(0, 3).join(', ')}
                        {JSON.parse(member.interests).length > 3 && '...'}
                      </div>
                    )}

                    {/* Contact Methods - Prominently displayed */}
                    <div className="pt-2 mt-2 border-t border-border/50 space-y-1">
                      <p className="text-xs font-semibold text-foreground/70 mb-1">📞 Contact:</p>
                      {member.website && (
                        <a href={member.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <span>🌐</span> <span className="truncate">{member.website}</span>
                        </a>
                      )}
                      {member.github_username && (
                        <a href={`https://github.com/${member.github_username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <span>💻</span> <span>GitHub: {member.github_username}</span>
                        </a>
                      )}
                      {member.twitter_username && (
                        <a href={`https://twitter.com/${member.twitter_username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <span>🐦</span> <span>@{member.twitter_username}</span>
                        </a>
                      )}
                      {member.linkedin_url && (
                        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <span>💼</span> <span>LinkedIn</span>
                        </a>
                      )}
                      {member.discord_username && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>💬</span> <span>Discord: {member.discord_username}</span>
                        </div>
                      )}
                      {!member.website && !member.github_username && !member.twitter_username && !member.linkedin_url && !member.discord_username && (
                        <p className="text-xs text-muted-foreground italic">No contact info yet</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // List View - Horizontal Layout
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/30 to-primary/60">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.display_name || 'Member'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary-foreground"
                      style={{ display: member.avatar_url ? 'none' : 'flex' }}
                    >
                      {(member.display_name || member.email || 'M')[0].toUpperCase()}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <h3 className="font-bold text-lg">
                        {member.display_name || member.email?.split('@')[0] || 'Member'}
                      </h3>
                      {member.tagline && (
                        <p className="text-sm text-muted-foreground italic">
                          {member.tagline}
                        </p>
                      )}
                    </div>

                    {member.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>📍</span>
                        <span>{member.location}</span>
                      </div>
                    )}

                    {member.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {member.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Skills */}
                      {member.skills && JSON.parse(member.skills).slice(0, 5).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    {/* Contact Methods - List View */}
                    <div className="pt-2 mt-2 border-t border-border/50">
                      <p className="text-xs font-semibold text-foreground/70 mb-1">📞 Contact:</p>
                      <div className="flex flex-wrap gap-2">
                        {member.website && (
                          <a href={member.website} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            🌐 Website
                          </a>
                        )}
                        {member.github_username && (
                          <a href={`https://github.com/${member.github_username}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            💻 GitHub
                          </a>
                        )}
                        {member.twitter_username && (
                          <a href={`https://twitter.com/${member.twitter_username}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            🐦 Twitter
                          </a>
                        )}
                        {member.linkedin_url && (
                          <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            💼 LinkedIn
                          </a>
                        )}
                        {member.discord_username && (
                          <span className="text-xs px-2 py-1 rounded-full bg-foreground/5 text-muted-foreground">
                            💬 {member.discord_username}
                          </span>
                        )}
                        {!member.website && !member.github_username && !member.twitter_username && !member.linkedin_url && !member.discord_username && (
                          <span className="text-xs text-muted-foreground italic">No contact info</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </motion.div>

              {/* AI Match Reason */}
              {aiSearchMode && member.match_reason && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className="mt-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20"
                >
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">Why this matches:</span>{' '}
                    {member.match_reason}
                  </p>
                </motion.div>
              )}
            </div>
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
