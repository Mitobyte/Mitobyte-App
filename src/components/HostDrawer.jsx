import React from 'react'
import { Drawer } from './ui/drawer'
import HostDashboard from './HostDashboard'

/**
 * HostDrawer Component
 * Wraps the HostDashboard in a drawer that slides up from the bottom
 */
export default function HostDrawer({ isOpen, onClose, user, dbUser }) {
  const handleClose = () => {
    try { window.dispatchEvent(new Event('mitobyte:close-all-drawers')) } catch {}
    onClose && onClose()
  }
  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
    >
      <div className="h-[90vh] overflow-y-auto">
        <HostDashboard
          user={user}
          dbUser={dbUser}
          onBack={handleClose}
          isInDrawer={true}
        />
      </div>
    </Drawer>
  )
}
