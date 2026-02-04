import { motion } from 'framer-motion';
import { Badge } from '../ui/badge';

// Generate unique gradient based on name - creates variety
function getAvatarGradient(name) {
    const gradients = [
        'from-violet-500 to-purple-600',
        'from-blue-500 to-cyan-500',
        'from-emerald-500 to-teal-500',
        'from-orange-500 to-amber-500',
        'from-pink-500 to-rose-500',
        'from-indigo-500 to-blue-500',
        'from-fuchsia-500 to-pink-500',
        'from-teal-500 to-green-500',
        'from-amber-500 to-yellow-500',
        'from-rose-500 to-red-500',
        'from-cyan-500 to-sky-500',
        'from-lime-500 to-emerald-500',
    ];

    // Hash the name to get consistent color
    let hash = 0;
    const str = name || 'Member';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
}

// Get initials from name (up to 2 characters)
function getInitials(name) {
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

// Avatar component with fallback
function MemberAvatar({ member, size = 'large' }) {
    const initials = getInitials(member.display_name || member.email?.split('@')[0]);
    const gradient = getAvatarGradient(member.display_name || member.email);

    const sizeClasses = {
        large: 'text-5xl md:text-6xl',
        medium: 'text-2xl',
        small: 'text-lg'
    };

    if (member.avatar_url) {
        return (
            <img
                src={member.avatar_url}
                alt={member.display_name || 'Member'}
                className="w-full h-full object-cover"
                onError={(e) => {
                    // On error, replace with gradient fallback
                    const parent = e.target.parentElement;
                    e.target.style.display = 'none';
                    const fallback = parent.querySelector('.avatar-fallback');
                    if (fallback) fallback.style.display = 'flex';
                }}
            />
        );
    }

    return (
        <div className={`avatar-fallback w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient}`}>
            <span className={`font-bold text-white ${sizeClasses[size]} tracking-tight select-none`}
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                {initials}
            </span>
        </div>
    );
}

export function MemberCard({ member, viewMode = 'grid', aiSearchMode = false }) {
    const hasContactInfo = member.website || member.github_username || member.twitter_username || member.linkedin_url || member.discord_username;
    const gradient = getAvatarGradient(member.display_name || member.email);
    const initials = getInitials(member.display_name || member.email?.split('@')[0]);

    if (viewMode === 'grid') {
        return (
            <motion.div
                className="group flex flex-col h-full bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-border transition-all duration-300 hover:shadow-lg"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
            >
                {/* Avatar - Clean square with gradient fallback */}
                <div className="aspect-square w-full overflow-hidden relative">
                    {member.avatar_url ? (
                        <>
                            <img
                                src={member.avatar_url}
                                alt={member.display_name || 'Member'}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                            <div
                                className={`w-full h-full items-center justify-center bg-gradient-to-br ${gradient}`}
                                style={{ display: 'none' }}
                            >
                                <span className="font-bold text-white text-5xl md:text-6xl tracking-tight select-none"
                                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    {initials}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient}`}>
                            <span className="font-bold text-white text-5xl md:text-6xl tracking-tight select-none"
                                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                {initials}
                            </span>
                        </div>
                    )}
                </div>

                {/* Profile Info */}
                <div className="p-5 space-y-3 flex-1 flex flex-col">
                    {/* Name & Tagline */}
                    <div>
                        <h3 className="font-semibold text-lg tracking-tight">
                            {member.display_name || member.email?.split('@')[0] || 'Member'}
                        </h3>
                        {member.tagline && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                {member.tagline}
                            </p>
                        )}
                    </div>

                    {/* Location */}
                    {member.location && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <span className="opacity-70">📍</span>
                            <span className="truncate">{member.location}</span>
                        </div>
                    )}

                    {/* Bio */}
                    {member.bio && (
                        <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
                            {member.bio}
                        </p>
                    )}

                    {/* Skills */}
                    {member.skills && (
                        <div className="flex flex-wrap gap-1.5">
                            {JSON.parse(member.skills).slice(0, 3).map((skill, i) => (
                                <Badge key={i} variant="secondary" className="text-xs font-medium px-2 py-0.5">
                                    {skill}
                                </Badge>
                            ))}
                            {JSON.parse(member.skills).length > 3 && (
                                <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                                    +{JSON.parse(member.skills).length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    <div className="flex-1" />

                    {/* Contact Links - Clean pills */}
                    {hasContactInfo && (
                        <div className="pt-3 border-t border-border/30 flex flex-wrap gap-1.5">
                            {member.github_username && (
                                <a href={`https://github.com/${member.github_username}`} target="_blank" rel="noopener noreferrer"
                                    className="text-xs px-2.5 py-1 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors">
                                    GitHub
                                </a>
                            )}
                            {member.linkedin_url && (
                                <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs px-2.5 py-1 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors">
                                    LinkedIn
                                </a>
                            )}
                            {member.twitter_username && (
                                <a href={`https://twitter.com/${member.twitter_username}`} target="_blank" rel="noopener noreferrer"
                                    className="text-xs px-2.5 py-1 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors">
                                    Twitter
                                </a>
                            )}
                            {member.website && (
                                <a href={member.website} target="_blank" rel="noopener noreferrer"
                                    className="text-xs px-2.5 py-1 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors">
                                    Website
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    // List View
    return (
        <motion.div
            className="group flex items-start gap-4 bg-card border border-border/50 p-4 rounded-2xl hover:border-border transition-all duration-300 hover:shadow-md"
            whileHover={{ y: -1 }}
            transition={{ duration: 0.2 }}
        >
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br ${gradient}`}>
                {member.avatar_url ? (
                    <>
                        <img
                            src={member.avatar_url}
                            alt={member.display_name || 'Member'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div
                            className="w-full h-full items-center justify-center"
                            style={{ display: 'none' }}
                        >
                            <span className="font-bold text-white text-xl">{initials}</span>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="font-bold text-white text-xl tracking-tight">{initials}</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                    <h3 className="font-semibold text-base tracking-tight">
                        {member.display_name || member.email?.split('@')[0] || 'Member'}
                    </h3>
                    {member.tagline && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                            {member.tagline}
                        </p>
                    )}
                </div>

                {member.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span className="opacity-70">📍</span>
                        <span>{member.location}</span>
                    </div>
                )}

                {/* Skills inline */}
                {member.skills && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {JSON.parse(member.skills).slice(0, 4).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-medium px-2 py-0.5">
                                {skill}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Contact Links */}
                {hasContactInfo && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                        {member.github_username && (
                            <a href={`https://github.com/${member.github_username}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors">
                                GitHub
                            </a>
                        )}
                        {member.linkedin_url && (
                            <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors">
                                LinkedIn
                            </a>
                        )}
                        {member.twitter_username && (
                            <a href={`https://twitter.com/${member.twitter_username}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors">
                                Twitter
                            </a>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
