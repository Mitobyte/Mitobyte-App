import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import EventManagement from './EventManagement'
import EventRequests from './EventRequests'
import AIEventCreator from './AIEventCreator'

/**
 * EventsHub Component
 * Consolidated events management hub with all event-related features
 */
export default function EventsHub({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('all-events')

  const subTabs = [
    { id: 'all-events', label: 'All Events', icon: '📅' },
    { id: 'requests', label: 'Event Requests', icon: '📋' },
    { id: 'create-ai', label: 'Create with AI', icon: '✨' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Events Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage all events, review requests, and create events with AI
        </p>
      </div>

      {/* Sub-tabs */}
      <Card className="p-1">
        <div className="flex space-x-1 overflow-x-auto">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
                activeSubTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Content */}
      <div>
        {activeSubTab === 'all-events' && (
          <EventManagement user={user} />
        )}

        {activeSubTab === 'requests' && (
          <EventRequests adminEmail={user.email} />
        )}

        {activeSubTab === 'create-ai' && (
          <AIEventCreator user={user} />
        )}
      </div>
    </div>
  )
}
