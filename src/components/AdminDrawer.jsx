import React from 'react'
import { Drawer } from './ui/drawer'
import AdminDashboard from './AdminDashboard'

/**
 * AdminDrawer Component
 * Wraps the AdminDashboard in a drawer that slides up from the bottom
 */
export default function AdminDrawer({ isOpen, onClose, user, dbUser, darkMode, toggleDarkMode }) {
  const handleClose = () => {
    try {
      window.dispatchEvent(new Event('mitobyte:close-all-drawers'))
    } catch {}
    onClose && onClose()
  }
  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
    >
      <div className="h-[90vh] overflow-y-auto">
        <AdminDashboard
          user={user}
          dbUser={dbUser}
          onBack={handleClose}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          isInDrawer={true}
        />
      </div>
    </Drawer>
  )
}
