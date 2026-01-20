import { motion } from 'framer-motion';
import { Button } from '../ui/button';

export function EventsHeroBanner({ onCreateEvent, isAdmin }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 mb-8"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative px-6 py-12 sm:px-12 sm:py-16">
        <div className="max-w-3xl">
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold mb-4"
          >
            Milwaukee Tech Events
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground mb-8"
          >
            Connect, learn, and build with Milwaukee's tech community — Powered by Mitobyte
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <Button
              size="lg"
              className="rounded-full px-8"
              onClick={() => {
                document.getElementById('events-list')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span className="mr-2">🔍</span>
              Find Events
            </Button>

            {isAdmin ? (
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8"
                onClick={onCreateEvent}
              >
                <span className="mr-2">➕</span>
                Create Event
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8"
                onClick={onCreateEvent}
              >
                <span className="mr-2">📝</span>
                Request Event
              </Button>
            )}
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex flex-wrap gap-6 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <div>
                <div className="font-semibold">Community-Driven</div>
                <div className="text-muted-foreground">By devs, for devs</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏙️</span>
              <div>
                <div className="font-semibold">Milwaukee Local</div>
                <div className="text-muted-foreground">Meet IRL</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <div>
                <div className="font-semibold">All Skill Levels</div>
                <div className="text-muted-foreground">Beginners welcome</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
