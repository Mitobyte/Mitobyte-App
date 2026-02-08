import { motion } from 'framer-motion';

export function EventsHeroBanner({ onCreateEvent, onFindEvents, isAdmin }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/10 px-4 py-3 mb-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎯</span>
          <div>
            <h1 className="text-lg font-semibold">Milwaukee Tech Events</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Connect, learn, and build with Milwaukee's tech community
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onFindEvents}
            className="text-sm px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            🔍 Find Events
          </button>
          <button
            onClick={onCreateEvent}
            className="text-sm px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors"
          >
            {isAdmin ? '➕ Create' : '📝 Request'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
