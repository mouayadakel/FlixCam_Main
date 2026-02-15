import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Code,
  Star,
  Zap,
  HardDrive,
  Wifi,
  Ruler,
  Cable,
  Monitor,
  Camera,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface SpecItem {
  key: string;
  label: string;
  labelAr?: string;
  value: string;
  type?: 'text' | 'boolean' | 'range' | 'colorTemp';
  highlight?: boolean;
  rangePercent?: number;
}

interface SpecGroup {
  label: string;
  labelAr?: string;
  icon: string;
  priority: number;
  specs: SpecItem[];
}

interface SpecHighlight {
  icon: string;
  label: string;
  value: string;
  sublabel?: string;
}

interface QuickSpec {
  icon: string;
  label: string;
  value: string;
}

interface StructuredSpecifications {
  highlights?: SpecHighlight[];
  quickSpecs?: QuickSpec[];
  groups: SpecGroup[];
}

interface SpecificationsEditorProps {
  value: StructuredSpecifications;
  onChange: (value: StructuredSpecifications) => void;
  categoryHint?: string;
}

// ============================================================================
// Icon Options
// ============================================================================

const iconOptions = [
  { value: 'star', label: 'Star', icon: Star },
  { value: 'zap', label: 'Power', icon: Zap },
  { value: 'hard-drive', label: 'Storage', icon: HardDrive },
  { value: 'wifi', label: 'Connectivity', icon: Wifi },
  { value: 'ruler', label: 'Dimensions', icon: Ruler },
  { value: 'cable', label: 'Cable', icon: Cable },
  { value: 'monitor', label: 'Display', icon: Monitor },
  { value: 'camera', label: 'Camera', icon: Camera },
  { value: 'info', label: 'Info', icon: Info }
];

// ============================================================================
// Preset Templates by Category
// ============================================================================

const categoryTemplates: Record<string, Partial<StructuredSpecifications>> = {
  cameras: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'star',
        priority: 1,
        specs: [
          { key: 'sensor', label: 'Sensor', labelAr: 'المستشعر', value: '', highlight: true },
          { key: 'video', label: 'Video', labelAr: 'الفيديو', value: '', highlight: true },
          { key: 'iso', label: 'ISO Range', labelAr: 'نطاق ISO', value: '' },
          { key: 'autofocus', label: 'Autofocus', labelAr: 'التركيز التلقائي', value: '' }
        ]
      },
      {
        label: 'Body & Display',
        labelAr: 'الجسم والشاشة',
        icon: 'monitor',
        priority: 2,
        specs: [
          { key: 'weight', label: 'Weight', labelAr: 'الوزن', value: '' },
          { key: 'display', label: 'Display', labelAr: 'الشاشة', value: '' },
          { key: 'evf', label: 'EVF', labelAr: 'المنظار الإلكتروني', value: '' }
        ]
      }
    ]
  },
  lighting: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'star',
        priority: 1,
        specs: [
          { key: 'type', label: 'Type', labelAr: 'النوع', value: '', highlight: true },
          { key: 'colorTemp', label: 'Color Temperature', labelAr: 'درجة اللون', value: '', type: 'colorTemp', highlight: true },
          { key: 'cri', label: 'CRI / TLCI', labelAr: 'دقة الألوان', value: '', highlight: true },
          { key: 'beamAngle', label: 'Beam Angle', labelAr: 'زاوية الإضاءة', value: '' }
        ]
      },
      {
        label: 'Power & I/O',
        labelAr: 'الطاقة والتوصيلات',
        icon: 'zap',
        priority: 2,
        specs: [
          { key: 'power', label: 'Power Consumption', labelAr: 'استهلاك الطاقة', value: '', highlight: true },
          { key: 'acInput', label: 'AC Input', labelAr: 'مدخل الكهرباء', value: '' },
          { key: 'battery', label: 'Battery', labelAr: 'البطارية', value: '' }
        ]
      }
    ]
  }
};

// ============================================================================
// Spec Item Editor
// ============================================================================

const SpecItemEditor: React.FC<{
  spec: SpecItem;
  onChange: (spec: SpecItem) => void;
  onDelete: () => void;
}> = ({ spec, onChange, onDelete }) => {
  return (
    <div className="group relative rounded-lg border border-border-light bg-white p-4 space-y-3 hover:border-brand-primary/30 hover:shadow-sm transition-all">
      {/* Drag Handle */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-text-muted" />
      </div>

      <div className="pl-6 space-y-3">
        {/* Key & Label Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">
              Key <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={spec.key}
              onChange={(e) => onChange({ ...spec, key: e.target.value })}
              placeholder="e.g., sensor"
              className="w-full px-3 py-1.5 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">
              Label (EN) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={spec.label}
              onChange={(e) => onChange({ ...spec, label: e.target.value })}
              placeholder="e.g., Sensor"
              className="w-full px-3 py-1.5 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>

        {/* Value & Label AR Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">
              Value <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={spec.value}
              onChange={(e) => onChange({ ...spec, value: e.target.value })}
              placeholder="e.g., 12.1MP Full-Frame"
              className="w-full px-3 py-1.5 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">
              Label (AR)
            </label>
            <input
              type="text"
              value={spec.labelAr || ''}
              onChange={(e) => onChange({ ...spec, labelAr: e.target.value })}
              placeholder="e.g., المستشعر"
              className="w-full px-3 py-1.5 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              dir="rtl"
            />
          </div>
        </div>

        {/* Type & Options Row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">
              Type
            </label>
            <select
              value={spec.type || 'text'}
              onChange={(e) => onChange({ ...spec, type: e.target.value as any })}
              className="w-full px-3 py-1.5 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="text">Text</option>
              <option value="boolean">Yes/No</option>
              <option value="range">Range Bar</option>
              <option value="colorTemp">Color Temp</option>
            </select>
          </div>

          {spec.type === 'range' && (
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">
                Range %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={spec.rangePercent || 70}
                onChange={(e) => onChange({ ...spec, rangePercent: parseInt(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          )}

          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={spec.highlight || false}
                onChange={(e) => onChange({ ...spec, highlight: e.target.checked })}
                className="rounded border-border-light text-brand-primary focus:ring-brand-primary/20"
              />
              <span className="text-xs font-medium text-text-muted">Highlight</span>
            </label>
          </div>
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};

// ============================================================================
// Group Editor
// ============================================================================

const GroupEditor: React.FC<{
  group: SpecGroup;
  onChange: (group: SpecGroup) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}> = ({ group, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const addSpec = () => {
    onChange({
      ...group,
      specs: [
        ...group.specs,
        {
          key: '',
          label: '',
          value: '',
          type: 'text'
        }
      ]
    });
  };

  return (
    <div className="rounded-xl border-2 border-border-light bg-surface-light/30 overflow-hidden">
      {/* Group Header */}
      <div className="flex items-center gap-3 bg-white border-b border-border-light p-4">
        {/* Expand/Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-surface-light rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {/* Icon Selector */}
        <select
          value={group.icon}
          onChange={(e) => onChange({ ...group, icon: e.target.value })}
          className="px-2 py-1 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        >
          {iconOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Group Label */}
        <input
          type="text"
          value={group.label}
          onChange={(e) => onChange({ ...group, label: e.target.value })}
          placeholder="Group Label (EN)"
          className="flex-1 px-3 py-1.5 text-sm font-medium border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />

        {/* Arabic Label */}
        <input
          type="text"
          value={group.labelAr || ''}
          onChange={(e) => onChange({ ...group, labelAr: e.target.value })}
          placeholder="التسمية (AR)"
          className="flex-1 px-3 py-1.5 text-sm border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          dir="rtl"
        />

        {/* Move Up/Down */}
        <div className="flex gap-1">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className={cn(
              "p-1.5 rounded transition-colors",
              canMoveUp ? "hover:bg-surface-light text-text-body" : "text-text-muted/30 cursor-not-allowed"
            )}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className={cn(
              "p-1.5 rounded transition-colors",
              canMoveDown ? "hover:bg-surface-light text-text-body" : "text-text-muted/30 cursor-not-allowed"
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Delete Group */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Group Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {group.specs.map((spec, idx) => (
            <SpecItemEditor
              key={idx}
              spec={spec}
              onChange={(updatedSpec) => {
                const newSpecs = [...group.specs];
                newSpecs[idx] = updatedSpec;
                onChange({ ...group, specs: newSpecs });
              }}
              onDelete={() => {
                onChange({
                  ...group,
                  specs: group.specs.filter((_, i) => i !== idx)
                });
              }}
            />
          ))}

          <button
            onClick={addSpec}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-border-light rounded-lg text-sm font-medium text-text-muted hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Specification
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Editor Component
// ============================================================================

export const SpecificationsEditor: React.FC<SpecificationsEditorProps> = ({
  value,
  onChange,
  categoryHint
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'json'>('edit');
  const [copied, setCopied] = useState(false);

  const addGroup = () => {
    const newPriority = value.groups.length + 1;
    onChange({
      ...value,
      groups: [
        ...value.groups,
        {
          label: '',
          icon: 'star',
          priority: newPriority,
          specs: []
        }
      ]
    });
  };

  const loadTemplate = () => {
    const template = categoryHint && categoryTemplates[categoryHint.toLowerCase()];
    if (template) {
      onChange({
        ...value,
        ...template,
        groups: template.groups || []
      });
    }
  };

  const moveGroup = (index: number, direction: 'up' | 'down') => {
    const newGroups = [...value.groups];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newGroups.length) return;

    // Swap
    [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]];
    
    // Update priorities
    newGroups.forEach((group, idx) => {
      group.priority = idx + 1;
    });

    onChange({ ...value, groups: newGroups });
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('edit')}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              viewMode === 'edit'
                ? "bg-brand-primary text-white"
                : "bg-surface-light text-text-body hover:bg-surface-light/80"
            )}
          >
            Edit
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              viewMode === 'preview'
                ? "bg-brand-primary text-white"
                : "bg-surface-light text-text-body hover:bg-surface-light/80"
            )}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              viewMode === 'json'
                ? "bg-brand-primary text-white"
                : "bg-surface-light text-text-body hover:bg-surface-light/80"
            )}
          >
            <Code className="h-4 w-4" />
            JSON
          </button>
        </div>

        {categoryHint && categoryTemplates[categoryHint.toLowerCase()] && (
          <button
            onClick={loadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-primary/80 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Load {categoryHint} Template
          </button>
        )}
      </div>

      {/* Content */}
      {viewMode === 'edit' && (
        <div className="space-y-4">
          {value.groups.map((group, idx) => (
            <GroupEditor
              key={idx}
              group={group}
              onChange={(updatedGroup) => {
                const newGroups = [...value.groups];
                newGroups[idx] = updatedGroup;
                onChange({ ...value, groups: newGroups });
              }}
              onDelete={() => {
                onChange({
                  ...value,
                  groups: value.groups.filter((_, i) => i !== idx)
                });
              }}
              onMoveUp={() => moveGroup(idx, 'up')}
              onMoveDown={() => moveGroup(idx, 'down')}
              canMoveUp={idx > 0}
              canMoveDown={idx < value.groups.length - 1}
            />
          ))}

          <button
            onClick={addGroup}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border-light rounded-xl text-sm font-semibold text-text-muted hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 transition-all"
          >
            <Plus className="h-5 w-5" />
            Add Group
          </button>
        </div>
      )}

      {viewMode === 'json' && (
        <div className="relative">
          <button
            onClick={copyJSON}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-surface-light/80 backdrop-blur rounded-lg text-sm font-medium hover:bg-surface-light transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
          <pre className="p-4 bg-neutral-900 text-emerald-400 rounded-xl text-xs overflow-x-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SpecificationsEditor;
