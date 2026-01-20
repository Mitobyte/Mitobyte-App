import React from 'react'
import { Card } from '../ui/card'
import { motion } from 'framer-motion'

/**
 * AdminStats Component
 * Displays statistics cards for the admin dashboard
 */
export default function AdminStats({ stats }) {
  const statCards = [
    {
      icon: '👥',
      label: 'Total Users',
      value: stats?.total || 0,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: '📅',
      label: 'New Today',
      value: stats?.createdToday || 0,
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: '📊',
      label: 'Active Users',
      value: stats?.activeUsers || 0,
      color: 'text-purple-600 dark:text-purple-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className={`text-4xl ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
