import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

/**
 * AdminUserTable Component
 * Displays a searchable, sortable table of users with admin management
 */
export default function AdminUserTable({ users, currentUserEmail, onPromoteUser, onDemoteUser, onDeleteUser, onSuspendUser, onUnsuspendUser, onPromoteHost, onDemoteHost, onPromoteSponsor, onDemoteSponsor }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const itemsPerPage = 20

  // Filter users based on search term, role, and status
  const filteredUsers = useMemo(() => {
    let filtered = [...users]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(user => {
        return (
          (user.email && user.email.toLowerCase().includes(term)) ||
          (user.display_name && user.display_name.toLowerCase().includes(term)) ||
          (user.id && user.id.toString().includes(term))
        )
      })
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => {
        if (filterRole === 'admin') return user.is_admin === 1
        if (filterRole === 'host') return user.is_host === 1
        if (filterRole === 'sponsor') return user.is_sponsor === 1
        if (filterRole === 'user') return user.is_admin !== 1 && user.is_host !== 1 && user.is_sponsor !== 1
        return true
      })
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => {
        if (filterStatus === 'active') return user.has_wallet && !user.is_suspended
        if (filterStatus === 'inactive') return !user.has_wallet && !user.is_suspended
        if (filterStatus === 'suspended') return user.is_suspended
        return true
      })
    }

    return filtered
  }, [users, searchTerm, filterRole, filterStatus])

  // Sort users
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers]
    sorted.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      // Handle null/undefined values
      if (aVal == null) aVal = ''
      if (bVal == null) bVal = ''

      // Convert to lowercase for string comparison
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredUsers, sortField, sortDirection])

  // Paginate users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedUsers.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedUsers, currentPage])

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage)

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Sort indicator
  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  // Delete handlers
  const handleDeleteClick = (user) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = () => {
    if (userToDelete && onDeleteUser) {
      onDeleteUser(userToDelete.id)
    }
    setShowDeleteConfirm(false)
    setUserToDelete(null)
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setUserToDelete(null)
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 space-y-3">
        <Input
          type="text"
          placeholder="🔍 Search by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          className="max-w-md"
        />

        <div className="flex flex-wrap gap-2">
          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins Only</option>
            <option value="host">Hosts Only</option>
            <option value="sponsor">Sponsors Only</option>
            <option value="user">Users Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Filter Count */}
          {(filterRole !== 'all' || filterStatus !== 'all' || searchTerm) && (
            <Badge variant="secondary" className="ml-2 self-center">
              {filteredUsers.length} filtered
            </Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted">
              <tr>
                <th
                  className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort('id')}
                >
                  ID <SortIndicator field="id" />
                </th>
                <th
                  className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort('display_name')}
                >
                  Name <SortIndicator field="display_name" />
                </th>
                <th
                  className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort('email')}
                >
                  Email <SortIndicator field="email" />
                </th>
                <th
                  className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort('created_at')}
                >
                  Created <SortIndicator field="created_at" />
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold">
                  Status
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold">
                  Role
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-muted-foreground">
                    {searchTerm ? 'No users found matching your search' : 'No users yet'}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium">
                      {user.id}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                      {user.display_name || <span className="text-muted-foreground italic">No name</span>}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                      {user.email || <span className="text-muted-foreground italic">No email</span>}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                      {user.is_suspended ? (
                        <Badge className="bg-red-600 hover:bg-red-700">Suspended</Badge>
                      ) : user.has_wallet ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                      <div className="flex gap-1 flex-wrap">
                        {user.is_admin === 1 && (
                          <Badge className="bg-purple-600 hover:bg-purple-700 text-[10px] sm:text-xs">Admin</Badge>
                        )}
                        {user.is_host === 1 && (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-[10px] sm:text-xs">Host</Badge>
                        )}
                        {user.is_sponsor === 1 && (
                          <Badge className="bg-orange-600 hover:bg-orange-700 text-[10px] sm:text-xs">Sponsor</Badge>
                        )}
                        {user.is_admin !== 1 && user.is_host !== 1 && user.is_sponsor !== 1 && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs">User</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                      <div className="flex gap-1 sm:gap-2 flex-wrap">
                        {user.is_admin === 1 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDemoteUser(user.id)}
                            disabled={user.email === currentUserEmail || user.email?.startsWith('carl@craftthefuture.xyz')}
                            className="text-xs"
                          >
                            Demote
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPromoteUser(user.id)}
                            className="text-xs"
                          >
                            Promote
                          </Button>
                        )}

                        {user.is_admin !== 1 && (
                          user.is_host === 1 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDemoteHost && onDemoteHost(user.id)}
                              disabled={!onDemoteHost}
                              className="text-xs"
                            >
                              Demote Host
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onPromoteHost && onPromoteHost(user.id)}
                              disabled={!onPromoteHost}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Make Host
                            </Button>
                          )
                        )}

                        {user.is_sponsor === 1 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDemoteSponsor && onDemoteSponsor(user.id)}
                            disabled={!onDemoteSponsor}
                            className="text-xs"
                          >
                            Remove Sponsor
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPromoteSponsor && onPromoteSponsor(user.id)}
                            disabled={!onPromoteSponsor}
                            className="text-xs text-orange-600 hover:text-orange-700"
                          >
                            Make Sponsor
                          </Button>
                        )}

                        {user.is_suspended ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUnsuspendUser && onUnsuspendUser(user.id)}
                            disabled={!onUnsuspendUser || user.email === currentUserEmail}
                            className="text-xs text-green-600 hover:text-green-700"
                          >
                            ✓ Restore
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSuspendUser && onSuspendUser(user.id)}
                            disabled={!onSuspendUser || user.email === currentUserEmail || user.email?.startsWith('carl@craftthefuture.xyz')}
                            className="text-xs text-orange-600 hover:text-orange-700"
                          >
                            ⏸ Suspend
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                          disabled={user.email === currentUserEmail || user.email?.startsWith('carl@craftthefuture.xyz')}
                          className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          🗑️
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedUsers.length)} of {sortedUsers.length} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleDeleteCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background border border-border rounded-lg p-6 max-w-md w-full"
          >
            <div className="flex items-start space-x-3 mb-4">
              <div className="text-3xl">⚠️</div>
              <div>
                <h3 className="text-lg font-bold mb-2">Delete User?</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Are you sure you want to delete user "{userToDelete.display_name || userToDelete.email}"?
                </p>
                <p className="text-sm text-destructive font-medium">
                  This will permanently delete the user and all associated RSVPs. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                🗑️ Delete User
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
