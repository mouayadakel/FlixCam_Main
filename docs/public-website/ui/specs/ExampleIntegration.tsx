// ============================================================================
// Example Integration - Equipment Detail Page
// ============================================================================

import React, { useState } from 'react'
import { SpecificationsDisplay } from './SpecificationsDisplay'
import { Package, FileText, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnySpecifications } from './types'
import { isStructuredSpecifications } from './types'

// ============================================================================
// Mock Equipment Data
// ============================================================================

interface Equipment {
  id: string
  name: string
  specifications?: AnySpecifications
  boxContents?: string[]
  description?: string
}

// Sample equipment with new structured specs
const sampleEquipment: Equipment = {
  id: '1',
  name: 'Sony A7S III',
  description: 'Professional full-frame mirrorless camera...',
  specifications: {
    highlights: [
      { icon: 'camera', label: 'Sensor', value: '12.1MP', sublabel: 'Full-Frame BSI' },
      { icon: 'video', label: 'Video', value: '4K 120p', sublabel: '10-bit 4:2:2' },
      { icon: 'scale', label: 'Weight', value: '699g', sublabel: 'Body Only' },
      { icon: 'battery', label: 'Battery', value: 'NP-FZ100', sublabel: '~600 shots' },
    ],
    quickSpecs: [
      { icon: 'aperture', label: 'Mount', value: 'E-Mount' },
      { icon: 'monitor', label: 'EVF', value: '9.44M-dot OLED' },
      { icon: 'layers', label: 'Cards', value: 'CFexpress + SD' },
      { icon: 'move', label: 'IBIS', value: '5-Axis 5.5 stops' },
    ],
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'star',
        priority: 1,
        specs: [
          {
            key: 'sensor',
            label: 'Sensor',
            labelAr: 'المستشعر',
            value: '12.1MP Full-Frame Exmor R BSI CMOS',
            highlight: true,
          },
          {
            key: 'video',
            label: 'Video',
            labelAr: 'الفيديو',
            value: '4K 120p 10-bit 4:2:2 Internal',
            highlight: true,
          },
          {
            key: 'iso',
            label: 'ISO Range',
            labelAr: 'نطاق ISO',
            value: '80–102,400 (Exp: 40–409,600)',
            type: 'range',
            rangePercent: 85,
          },
        ],
      },
      {
        label: 'Connectivity',
        labelAr: 'الاتصال',
        icon: 'wifi',
        priority: 2,
        specs: [
          { key: 'wifi', label: 'WiFi', labelAr: 'واي فاي', value: 'Yes', type: 'boolean' },
          {
            key: 'bluetooth',
            label: 'Bluetooth',
            labelAr: 'بلوتوث',
            value: 'Yes',
            type: 'boolean',
          },
          { key: 'hdmi', label: 'HDMI', labelAr: 'HDMI', value: 'Full-size Type A' },
        ],
      },
    ],
  },
  boxContents: [
    'Sony A7S III Camera Body',
    'NP-FZ100 Rechargeable Battery',
    'BC-QZ1 Battery Charger',
    'USB-C Cable',
    'Shoulder Strap',
    'Body Cap',
    'Accessory Shoe Cap',
    'Eyepiece Cup',
  ],
}

// ============================================================================
// Tab Component
// ============================================================================

interface TabsProps {
  defaultValue?: string
  children: React.ReactNode
  className?: string
}

const Tabs: React.FC<TabsProps> = ({ defaultValue, children, className }) => {
  const [activeTab, setActiveTab] = useState(defaultValue || 'overview')

  return (
    <div className={cn('w-full', className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeTab, setActiveTab } as any)
        }
        return child
      })}
    </div>
  )
}

const TabsList: React.FC<{
  children: React.ReactNode
  activeTab?: string
  setActiveTab?: (tab: string) => void
  className?: string
}> = ({ children, activeTab, setActiveTab, className }) => {
  return (
    <div
      className={cn(
        'inline-flex h-12 items-center justify-start rounded-xl bg-surface-light p-1 text-text-muted',
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeTab, setActiveTab } as any)
        }
        return child
      })}
    </div>
  )
}

const TabsTrigger: React.FC<{
  value: string
  children: React.ReactNode
  activeTab?: string
  setActiveTab?: (tab: string) => void
  className?: string
}> = ({ value, children, activeTab, setActiveTab, className }) => {
  const isActive = activeTab === value

  return (
    <button
      onClick={() => setActiveTab?.(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isActive ? 'bg-white text-text-heading shadow-sm' : 'text-text-muted hover:text-text-body',
        className
      )}
    >
      {children}
    </button>
  )
}

const TabsContent: React.FC<{
  value: string
  children: React.ReactNode
  activeTab?: string
  className?: string
}> = ({ value, children, activeTab, className }) => {
  if (activeTab !== value) return null

  return <div className={cn('mt-2', className)}>{children}</div>
}

// ============================================================================
// Main Equipment Detail Component
// ============================================================================

export const EquipmentDetailExample: React.FC = () => {
  const equipment = sampleEquipment
  const hasStructuredSpecs =
    equipment.specifications && isStructuredSpecifications(equipment.specifications)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Product Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-text-heading">{equipment.name}</h1>
        <p className="text-text-muted">Professional Mirrorless Camera Body</p>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Gallery & Info */}
        <div className="space-y-8 lg:col-span-2">
          {/* Gallery Placeholder */}
          <div className="rounded-2xl border border-border-light bg-surface-light/30 p-12 text-center">
            <p className="text-text-muted">Product Gallery Goes Here</p>
          </div>

          {/* Quick Specs Pills (if available) */}
          {hasStructuredSpecs && equipment.specifications.quickSpecs && (
            <div className="flex flex-wrap gap-2">
              {equipment.specifications.quickSpecs.map((spec, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2.5 rounded-full border border-border-light/60 bg-surface-light/50 px-4 py-2 text-sm transition-all hover:border-brand-primary/30 hover:bg-brand-primary/[0.02]"
                >
                  <span className="text-brand-primary">●</span>
                  <span className="text-text-muted">{spec.label}</span>
                  <span className="font-semibold text-text-heading">{spec.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">
                <Info className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="specs">
                <FileText className="mr-2 h-4 w-4" />
                Specifications
              </TabsTrigger>
              <TabsTrigger value="box">
                <Package className="mr-2 h-4 w-4" />
                What's in the Box
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="pt-6">
              <div className="rounded-2xl border border-border-light/60 bg-white p-6 shadow-card">
                <h3 className="mb-4 text-xl font-semibold text-text-heading">
                  About this Equipment
                </h3>
                <div className="prose prose-sm max-w-none text-text-body">
                  <p>{equipment.description}</p>
                  <p className="mt-4">
                    The Sony A7S III is a professional full-frame mirrorless camera designed for
                    videographers and low-light photographers. With its 12.1MP sensor optimized for
                    video performance, it delivers exceptional image quality even in challenging
                    lighting conditions.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Specifications Tab - THE STAR OF THE SHOW! */}
            <TabsContent value="specs" className="pt-6">
              {equipment.specifications ? (
                <SpecificationsDisplay specifications={equipment.specifications} locale="en" />
              ) : (
                <div className="rounded-2xl border border-border-light/60 bg-white p-12 text-center">
                  <Info className="mx-auto mb-3 h-12 w-12 text-text-muted" />
                  <p className="text-text-muted">No specifications available</p>
                </div>
              )}
            </TabsContent>

            {/* Box Contents Tab */}
            <TabsContent value="box" className="pt-6">
              <div className="overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card">
                <div className="border-b border-border-light/40 bg-surface-light/50 px-6 py-4">
                  <h3 className="text-lg font-semibold text-text-heading">Package Contents</h3>
                </div>
                <div className="p-6">
                  {equipment.boxContents && equipment.boxContents.length > 0 ? (
                    <ul className="space-y-3">
                      {equipment.boxContents.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-text-body">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary">
                            {idx + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-8 text-center text-text-muted">
                      No box contents information available
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar (Price, Booking, etc.) */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            {/* Pricing Card Placeholder */}
            <div className="rounded-2xl border border-border-light bg-white p-6 shadow-card">
              <div className="mb-4 text-center">
                <p className="mb-1 text-sm text-text-muted">Rental Price</p>
                <p className="text-3xl font-bold text-text-heading">$49/day</p>
              </div>
              <button className="w-full rounded-xl bg-brand-primary py-3 font-semibold text-white transition-colors hover:bg-brand-primary/90">
                Book Now
              </button>
            </div>

            {/* Quick Info */}
            <div className="space-y-3 rounded-2xl border border-border-light bg-white p-6 shadow-card">
              <h4 className="mb-3 font-semibold text-text-heading">Quick Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Category</span>
                  <span className="font-medium text-text-heading">Cameras</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Availability</span>
                  <span className="font-medium text-emerald-600">In Stock</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Min Rental</span>
                  <span className="font-medium text-text-heading">1 Day</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Usage Instructions
// ============================================================================

/*
INTEGRATION STEPS:

1. Install Dependencies:
   npm install lucide-react

2. Update your equipment-detail.tsx:
   import { SpecificationsDisplay } from '@/components/specifications/SpecificationsDisplay';
   
   // Replace the existing specifications table with:
   <SpecificationsDisplay 
     specifications={equipment.specifications}
     locale={locale} // 'en' or 'ar'
   />

3. Database Migration (Optional - for new products):
   // Your Prisma schema already has specifications as Json
   // Just update the JSON structure when creating/editing products

4. Admin Panel Integration:
   import { SpecificationsEditor } from '@/components/specifications/SpecificationsEditor';
   
   <SpecificationsEditor
     value={specifications}
     onChange={setSpecifications}
     categoryHint={equipment.category.name.toLowerCase()}
   />

5. Backward Compatibility:
   // Existing flat specifications will still work!
   // The component automatically detects and renders them
   // No migration needed for existing data

EXAMPLE API RESPONSE:
{
  "id": "123",
  "name": "Sony A7S III",
  "specifications": {
    "highlights": [...],
    "quickSpecs": [...],
    "groups": [...]
  }
}

MIGRATION HELPER:
If you want to convert existing flat specs to structured:

import { convertFlatToStructured } from '@/lib/specifications-utils';

const structuredSpecs = convertFlatToStructured(
  oldFlatSpecs,
  'cameras' // category hint
);
*/

export default EquipmentDetailExample
