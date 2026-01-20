import { useState, useEffect } from 'react';

/**
 * EventSponsors Component
 * Displays sponsor logos for an event
 */
export default function EventSponsors({ eventId, size = 'md' }) {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const fetchSponsors = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/event-sponsorships?eventId=${eventId}`);
        const data = await response.json();

        if (data.success && data.sponsors) {
          setSponsors(data.sponsors);
        }
      } catch (err) {
        console.error('Error fetching sponsors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, [eventId]);

  if (loading || sponsors.length === 0) return null;

  // Group sponsors by tier
  const platinum = sponsors.filter(s => s.tier === 'platinum');
  const premium = sponsors.filter(s => s.tier === 'premium');
  const standard = sponsors.filter(s => s.tier === 'standard');

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-8';
      case 'lg': return 'h-20';
      default: return 'h-12';
    }
  };

  const renderSponsorGroup = (sponsorList, tier, label) => {
    if (sponsorList.length === 0) return null;

    return (
      <div key={tier} className="mb-4 last:mb-0">
        {size !== 'sm' && (
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
            {label}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          {sponsorList.map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.sponsor_website_url || '#'}
              target={sponsor.sponsor_website_url ? '_blank' : undefined}
              rel={sponsor.sponsor_website_url ? 'noopener noreferrer' : undefined}
              className={`block ${getSizeClasses()} ${sponsor.sponsor_website_url ? 'hover:opacity-75 transition-opacity cursor-pointer' : ''}`}
              title={sponsor.sponsor_name}
            >
              <img
                src={sponsor.sponsor_logo_url}
                alt={sponsor.sponsor_name}
                className="h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="border-t border-border pt-6 mt-6">
      {size !== 'sm' && (
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span>💼</span>
          <span>Sponsored By</span>
        </h3>
      )}
      <div className={size === 'sm' ? 'space-y-2' : 'space-y-4'}>
        {renderSponsorGroup(platinum, 'platinum', 'Platinum Sponsors')}
        {renderSponsorGroup(premium, 'premium', 'Premium Sponsors')}
        {renderSponsorGroup(standard, 'standard', 'Sponsors')}
      </div>
    </div>
  );
}
