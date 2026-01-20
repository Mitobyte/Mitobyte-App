import React from 'react'
import Z_INDEX from '../lib/z-index'

const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'events', label: 'Events', icon: '📅' },
    { id: 'showcase', label: 'Feed', icon: '📰' },
    { id: 'checkin', label: 'Connect', icon: '🔗' },
    { id: 'directory', label: 'Directory', icon: '👥' },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/40"
      style={{ zIndex: Z_INDEX.BOTTOM_NAV }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                  isActive ? '' : 'hover:bg-foreground/5'
                }`}
              >
                {/* Icon */}
                <span className="text-lg">{tab.icon}</span>

                {/* Label */}
                <span
                  className={`text-xs font-medium ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default BottomNav
