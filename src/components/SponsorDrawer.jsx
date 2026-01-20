import React from 'react'
import { Drawer } from './ui/drawer'
import SponsorDashboard from './SponsorDashboard'

export default function SponsorDrawer({ isOpen, onClose, user }) {
  const handleClose = () => {
    try { window.dispatchEvent(new Event('mitobyte:close-all-drawers')) } catch {}
    onClose && onClose()
  }
  return (
    <Drawer isOpen={isOpen} onClose={handleClose}>
      <div className="h-[90vh] overflow-y-auto">
        <SponsorDashboard
          user={user}
          onBack={handleClose}
          isInDrawer={true}
        />
      </div>
    </Drawer>
  )
}
