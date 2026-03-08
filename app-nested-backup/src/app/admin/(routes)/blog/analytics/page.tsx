'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  ArrowRight,
  Eye,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  FileText,
  Bot,
  Zap,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

interface BlogAnalytics {
  totalViews: number
  totalReactions: number
  helpfulYes: number
  helpfulNo: number
  topPosts: Array<{
    id: string
    titleEn: string
    slug: string
    views: number
    helpfulYes: number
    helpfulNo: number
  }>
  viewsByDay: Array<{ date: string; views: number; unique: number }>
  byCategory: Array<{
    categoryId: string
    categoryName: string
    posts: number
    views: number
  }>
}

interface BlogAiUsageStats {
  totalCallsToday: number
  totalCostToday: number
  byEndpoint: Array<{ endpoint: string; calls: number; cost: number }>
  topUsers: Array<{ userId: string; calls: number; cost: number }>
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']

export default function AdminBlogAnalyticsPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<BlogAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiDays, setAiDays] = useState(1)
  const [aiUsage, setAiUsage] = useState<BlogAiUsageStats | null>(null)
  const [aiLoading, setAiLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/blog/analytics?days=${days}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setData(json)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [days])

  useEffect(() => {
    setAiLoading(true)
    fetch(`/api/admin/blog/ai-usage?days=${aiDays}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setAiUsage(json)
      })
      .catch(() => setAiUsage(null))
      .finally(() => setAiLoading(false))
  }, [aiDays])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/blog">
              <ArrowRight className="me-1 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold">Blog Analytics</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/blog">
              <ArrowRight className="me-1 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v, 10))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <h1 className="text-2xl font-bold">Blog Analytics</h1>

      {!data ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Failed to load analytics</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Unique IPs (deduplicated)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Reactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalReactions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Helpful votes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Helpful (Yes)</CardTitle>
                <ThumbsUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {data.helpfulYes.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Not Helpful (No)</CardTitle>
                <ThumbsDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {data.helpfulNo.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Views Over Time</CardTitle>
                <CardDescription>Daily views and unique visitors</CardDescription>
              </CardHeader>
              <CardContent>
                {data.viewsByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.viewsByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="views" stroke="#6366f1" name="Views" />
                      <Line type="monotone" dataKey="unique" stroke="#8b5cf6" name="Unique" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                    No data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Views by Category</CardTitle>
                <CardDescription>Distribution across categories</CardDescription>
              </CardHeader>
              <CardContent>
                {data.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={data.byCategory}
                        dataKey="views"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(payload: { name?: string; value?: number; percent?: number }) =>
                          `${payload.name ?? ''} ${((payload.percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {data.byCategory.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                    No data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Posts</CardTitle>
              <CardDescription>Most viewed posts</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topPosts.length > 0 ? (
                <div className="space-y-4">
                  {data.topPosts.map((post, i) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between border-b border-muted/50 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {i + 1}
                        </span>
                        <div>
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline"
                          >
                            {post.titleEn}
                          </Link>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                            <span>{post.views} views</span>
                            <span className="text-green-600">{post.helpfulYes} helpful</span>
                            <span className="text-red-600">{post.helpfulNo} not helpful</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/blog/edit/${post.id}`}>
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No posts yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Usage
                </CardTitle>
                <CardDescription>Blog AI endpoint calls and estimated cost</CardDescription>
              </div>
              <Select value={String(aiDays)} onValueChange={(v) => setAiDays(parseInt(v, 10))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Today</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-48" />
                  <Skeleton className="h-48" />
                </div>
              ) : !aiUsage ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Zap className="h-12 w-12 mb-4" />
                  <p>Failed to load AI usage</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Zap className="h-4 w-4" />
                        Total calls
                      </div>
                      <div className="mt-2 text-2xl font-bold">
                        {aiUsage.totalCallsToday.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Bot className="h-4 w-4" />
                        Estimated cost
                      </div>
                      <div className="mt-2 text-2xl font-bold">
                        ${aiUsage.totalCostToday.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <h4 className="mb-3 text-sm font-medium">Calls per endpoint</h4>
                      {aiUsage.byEndpoint.length > 0 ? (
                        <div className="rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="px-4 py-2 text-start font-medium">Endpoint</th>
                                <th className="px-4 py-2 text-end font-medium">Calls</th>
                                <th className="px-4 py-2 text-end font-medium">Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aiUsage.byEndpoint.map((row, i) => (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="px-4 py-2 font-mono text-xs">{row.endpoint}</td>
                                  <td className="px-4 py-2 text-end">{row.calls}</td>
                                  <td className="px-4 py-2 text-end">${row.cost.toFixed(4)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="py-4 text-sm text-muted-foreground">No AI calls in this period</p>
                      )}
                    </div>
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <Users className="h-4 w-4" />
                        Top users
                      </h4>
                      {aiUsage.topUsers.length > 0 ? (
                        <div className="rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="px-4 py-2 text-start font-medium">User ID</th>
                                <th className="px-4 py-2 text-end font-medium">Calls</th>
                                <th className="px-4 py-2 text-end font-medium">Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aiUsage.topUsers.map((row, i) => (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="px-4 py-2 font-mono text-xs truncate max-w-[180px]">
                                    {row.userId || '(anonymous)'}
                                  </td>
                                  <td className="px-4 py-2 text-end">{row.calls}</td>
                                  <td className="px-4 py-2 text-end">${row.cost.toFixed(4)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="py-4 text-sm text-muted-foreground">No user data</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
