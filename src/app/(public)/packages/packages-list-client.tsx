/**
 * Packages list client (Phase 3).
 * Upgraded with dynamic Hero Carousel, Featured section, and premium grid layout.
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Camera, Video, Search, Star, Sparkles } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { PackageCard } from '@/components/features/packages/package-card'
import type { UnifiedPackageItem } from '@/app/(public)/packages/page'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { HeroCarousel } from '@/components/features/home/hero-carousel'

interface PackagesListClientProps {
  packages: UnifiedPackageItem[]
  featured: UnifiedPackageItem[]
  heroBanner: any // From prisma
}

export function PackagesListClient({ 
  packages, 
  featured, 
  heroBanner 
}: PackagesListClientProps) {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState<'all' | 'kit' | 'studio'>('all')
  const [search, setSearch] = useState('')

  // Filter packages based on tab and search
  const filteredPackages = packages.filter((pkg) => {
    // Filter by type
    if (activeTab !== 'all' && pkg.type !== activeTab) return false

    // Filter by search
    if (search.trim()) {
      const s = search.toLowerCase()
      const matchName = pkg.name?.toLowerCase().includes(s) || pkg.nameEn?.toLowerCase().includes(s)
      const matchDesc =
        pkg.description?.toLowerCase().includes(s) || pkg.descriptionEn?.toLowerCase().includes(s)
      if (!matchName && !matchDesc) return false
    }

    return true
  })

  // Sort: Recommended/SortOrder first, then by price
  const sortedPackages = [...filteredPackages].sort((a, b) => {
    // 1. Recommended status (🔥)
    const aRec = a.recommended || a.cmsData?.recommended
    const bRec = b.recommended || b.cmsData?.recommended
    if (aRec && !bRec) return -1
    if (!aRec && bRec) return 1

    // 2. CMS Manual Sort Order (0 is highest)
    const aOrder = a.cmsData?.sortOrder ?? 999
    const bOrder = b.cmsData?.sortOrder ?? 999
    if (aOrder !== bOrder) return aOrder - bOrder
    
    // 3. Price (Lowest first)
    return (a.finalPrice || 0) - (b.finalPrice || 0)
  })

  const hasBanner = heroBanner && heroBanner.slides && heroBanner.slides.length > 0

  return (
    <div className="space-y-12">
      {/* ─── HERO SECTION ─── */}
      {hasBanner ? (
        <div className="-mx-4 -mt-8 mb-12 overflow-hidden md:-mx-8">
          <HeroCarousel 
            slides={heroBanner.slides} 
            settings={{
              autoPlay: heroBanner.autoPlay,
              autoPlayInterval: heroBanner.autoPlayInterval,
              transitionType: heroBanner.transitionType
            }} 
          />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-hero-gradient p-8 md:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
          <div className="absolute -end-24 -top-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-24 -start-24 h-64 w-64 rounded-full bg-black/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="mb-4 inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm shadow-sm border border-white/10">
                <Sparkles className="me-2 h-4 w-4 text-brand-secondary-accent" />
                {t('packagesPage.badgeText') || 'عروض فليكس كام الحصرية'}
              </span>
              <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl text-white">
                {t('packagesPage.heroTitle')}
              </h1>
              <p className="mb-8 text-lg text-white/70 md:text-xl">
                {t('packagesPage.heroSubtitle')}
              </p>
            </motion.div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 md:px-0">
        
        {/* ─── FEATURED SECTION (Only if no search/tab active) ─── */}
        {featured.length > 0 && activeTab === 'all' && !search && (
          <section className="mb-16">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                  <Star className="h-5 w-5 fill-current" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">باقات مختارة لك</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featured.map((pkg) => (
                <PackageCard key={`featured-${pkg.id}`} pkg={pkg} isFeatured />
              ))}
            </div>
            <div className="mt-12 h-px bg-gradient-to-r from-transparent via-muted to-transparent" />
          </section>
        )}

        {/* ─── FILTERS & SEARCH ─── */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">تصفية حسب</h3>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full md:w-auto"
            >
              <TabsList className="h-12 w-full justify-start p-1 bg-muted/50 md:w-auto">
                <TabsTrigger value="all" className="flex-1 rounded-md px-6 md:flex-none">
                  {t('packagesPage.tabAll')}
                </TabsTrigger>
                <TabsTrigger value="kit" className="flex-1 rounded-md px-6 md:flex-none">
                  <Camera className="me-2 h-4 w-4" />
                  {t('packagesPage.tabKits')}
                </TabsTrigger>
                <TabsTrigger value="studio" className="flex-1 rounded-md px-6 md:flex-none">
                  <Video className="me-2 h-4 w-4" />
                  {t('packagesPage.tabStudios')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col gap-2 md:w-80">
             <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">بحث سريع</h3>
            <div className="relative">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="اسم الباقة أو السعر..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 pe-10 shadow-sm transition-all focus-within:shadow-md border-muted focus-visible:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* ─── MAIN GRID ─── */}
        <div className="space-y-6">
           <div className="flex items-center justify-between text-sm text-muted-foreground">
             <p>عرض {sortedPackages.length} باقة متاحة</p>
           </div>
           
           {sortedPackages.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <AnimatePresence mode="popLayout">
                {sortedPackages.map((pkg, idx) => (
                  <motion.div
                    key={pkg.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <PackageCard pkg={pkg} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-muted-foreground/20 bg-muted/10 p-8 text-center"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 shadow-inner">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">لا توجد نتائج مطابقة</h3>
              <p className="mb-6 max-w-md text-muted-foreground">
                {search
                  ? 'لم نجد باقة مطابقة لعملية البحث الحالية. حاول استخدام مصطلحات أخرى أو مسح الفلاتر.'
                  : t('packagesPage.noPackages')}
              </p>
              {search && (
                <Button variant="outline" onClick={() => setSearch('')} className="rounded-xl">
                  مسح البحث والعودة
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
