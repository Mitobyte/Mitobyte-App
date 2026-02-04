import { motion } from 'framer-motion';
import { Input } from '../ui/input';

export function DirectoryFilters({
    searchTerm,
    setSearchTerm,
    aiSearchQuery,
    setAiSearchQuery,
    aiSearchMode,
    setAiSearchMode,
    aiSearching,
    handleAiSearch,
    clearAiSearch,
    filterSkill,
    setFilterSkill,
    filteredCount,
    totalCount,
    aiSearchResultsCount
}) {
    const popularSkills = ['All', 'React', 'Python', 'JavaScript', 'TypeScript', 'Node.js', 'AI/ML', 'Backend', 'Frontend', 'Design'];

    return (
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
                                    Showing {aiSearchResultsCount} AI-matched members for "{aiSearchQuery}"
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
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${(skill === 'All' && filterSkill === 'all') || filterSkill === skill
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
                    <span>Showing {filteredCount} of {totalCount} members</span>
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
    );
}
