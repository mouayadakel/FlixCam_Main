/**
 * @file recent-activity.tsx
 * @description Recent activity component
 * @module components/admin
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Presentational view-model for a recent-activity feed row (not a persisted entity). */
export interface ActivityItem {
  id: string
  action: string
  user: string
  resource: string
  timestamp: string
}

interface RecentActivityProps {
  activities: ActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.action}</p>
                <p className="text-xs text-muted-foreground">
                  {activity.user} • {activity.resource}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
