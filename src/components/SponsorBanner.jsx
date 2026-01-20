import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

export default function SponsorBanner() {
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    fetchSponsors()
  }, [])

  const fetchSponsors = async () => {
    try {
      const response = await fetch('/api/sponsors')
      const data = await response.json()
      if (data.success && data.sponsors.length > 0) {
        setSponsors(data.sponsors)
      }
    } catch (error) {
      console.error('Error fetching sponsors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSponsorClick = async (sponsor) => {
    // Track click
    try {
      await fetch(`/api/sponsors/${sponsor.id}/track-click`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error tracking click:', error)
    }

    // Open website
    if (sponsor.website_url) {
      window.open(sponsor.website_url, '_blank', 'noopener,noreferrer')
    }
  }

  // Don't render if no sponsors
  if (loading || sponsors.length === 0) {
    return null
  }

  // Duplicate sponsors array for seamless infinite scroll
  const duplicatedSponsors = [...sponsors, ...sponsors, ...sponsors]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-secondary border-b border-primary/30 dark:border-primary/20"
        style={{ zIndex: 40 }}
      >
        <div className="relative h-14 flex items-center" role="region" aria-label="Sponsor banner">
          {/* Gradient fade on left - theme aware */}
          <div
            className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-r from-primary to-transparent"
          />

          {/* Scrolling content */}
          <div className="flex items-center w-full overflow-hidden pl-24 pr-24">
            <motion.div
              className="flex items-center gap-6 whitespace-nowrap"
              animate={prefersReducedMotion ? undefined : { x: [0, '-33.333%'] }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      x: {
                        repeat: Infinity,
                        repeatType: "loop",
                        duration: Math.max(12, sponsors.length * 10),
                        ease: "linear",
                      },
                    }
              }
            >
              {/* Static intro text */}
              <span
                className="font-bold text-base px-6 flex-shrink-0"
                style={{
                  color: '#FFFFFF',
                  textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)',
                  fontWeight: '800',
                  WebkitTextStroke: '0.5px rgba(0,0,0,0.3)'
                }}
              >
                ⭐ Our events powered by:
              </span>

              {/* Sponsor logos */}
              {duplicatedSponsors.map((sponsor, index) => (
                <motion.div
                  key={`${sponsor.id}-${index}`}
                  onClick={() => handleSponsorClick(sponsor)}
                  className="flex items-center gap-3 cursor-pointer flex-shrink-0 rounded-lg px-5 py-2.5 bg-primary-foreground/20 hover:bg-primary-foreground/30 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  title={`Visit ${sponsor.name}`}
                >
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="h-8 w-auto object-contain drop-shadow-sm"
                    style={{ maxWidth: '140px' }}
                    onError={(e) => {
                      // Fallback to text if image fails
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'inline'
                    }}
                  />
                  <span
                    className="font-semibold text-sm hidden"
                    style={{
                      color: '#FFFFFF',
                      textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)',
                      fontWeight: '700'
                    }}
                  >
                    {sponsor.name}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Gradient fade on right - theme aware */}
          <div
            className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-l from-secondary to-transparent"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
