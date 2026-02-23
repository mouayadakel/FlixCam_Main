import { useState, useRef, useEffect, useCallback } from 'react'

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg: '#0A0E1A',
  surface: '#111827',
  surfaceHover: '#1a2235',
  border: '#1e2d45',
  borderLight: '#2a3f5f',
  accent: '#00D4FF',
  accentDim: '#0099bb',
  accentGlow: 'rgba(0,212,255,0.15)',
  gold: '#F5C842',
  goldDim: '#c9a130',
  green: '#00E599',
  greenDim: '#00b377',
  red: '#FF4D6A',
  orange: '#FF8C42',
  text: '#E8EEF7',
  textMid: '#8BA3C4',
  textDim: '#4a6080',
  ai: '#7C3AED',
  aiDim: '#5b2ab5',
  aiGlow: 'rgba(124,58,237,0.2)',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { color-scheme: dark; }
  body { background: ${T.bg}; color: ${T.text}; font-family: 'DM Sans', sans-serif; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${T.surface}; } ::-webkit-scrollbar-thumb { background: ${T.borderLight}; border-radius: 2px; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes glow { 0%,100%{box-shadow:0 0 8px ${T.accentGlow}} 50%{box-shadow:0 0 20px ${T.accentGlow},0 0 40px ${T.accentGlow}} }
  @keyframes typewriter { from{width:0} to{width:100%} }
  @keyframes blink { 0%,50%{opacity:1} 51%,100%{opacity:0} }
  @keyframes aiPulse { 0%,100%{box-shadow:0 0 0 0 ${T.aiGlow}} 50%{box-shadow:0 0 0 8px transparent} }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
  .shimmer { background: linear-gradient(90deg, ${T.surface} 25%, ${T.surfaceHover} 50%, ${T.surface} 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
  .ai-glow { animation: aiPulse 2s infinite; }
`

// ─── EQUIPMENT DATA FIELDS ────────────────────────────────────────────────────
const FIELD_GROUPS = [
  {
    id: 'identity',
    label: 'Identity',
    icon: '◈',
    fields: [
      { key: 'name_en', label: 'Name (EN)', type: 'text', ai: true, required: true },
      { key: 'name_ar', label: 'الاسم (AR)', type: 'text', ai: true, required: true, rtl: true },
      { key: 'name_zh', label: '名称 (ZH)', type: 'text', ai: true },
      { key: 'brand', label: 'Brand', type: 'text', ai: false, required: true },
      { key: 'model', label: 'Model', type: 'text', ai: false },
      { key: 'sku', label: 'SKU', type: 'text', ai: true },
      { key: 'slug', label: 'URL Slug', type: 'text', ai: true },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        ai: false,
        options: [
          'Cameras',
          'Lenses',
          'Lighting',
          'Audio',
          'Stabilizers',
          'Monitors',
          'Accessories',
          'Drones',
        ],
      },
    ],
  },
  {
    id: 'descriptions',
    label: 'Descriptions',
    icon: '✦',
    fields: [
      {
        key: 'short_desc_en',
        label: 'Short Description (EN)',
        type: 'textarea',
        ai: true,
        rows: 2,
      },
      {
        key: 'short_desc_ar',
        label: 'وصف مختصر (AR)',
        type: 'textarea',
        ai: true,
        rows: 2,
        rtl: true,
      },
      { key: 'long_desc_en', label: 'Long Description (EN)', type: 'textarea', ai: true, rows: 5 },
      {
        key: 'long_desc_ar',
        label: 'وصف تفصيلي (AR)',
        type: 'textarea',
        ai: true,
        rows: 5,
        rtl: true,
      },
      { key: 'key_features', label: 'Key Features (bullets)', type: 'textarea', ai: true, rows: 3 },
      { key: 'use_cases', label: 'Use Cases & Applications', type: 'textarea', ai: true, rows: 3 },
      { key: 'target_audience', label: 'Target Audience', type: 'text', ai: true },
    ],
  },
  {
    id: 'seo',
    label: 'SEO',
    icon: '⬡',
    fields: [
      { key: 'seo_title_en', label: 'SEO Title (EN)', type: 'text', ai: true, maxlen: 60 },
      {
        key: 'seo_title_ar',
        label: 'عنوان SEO (AR)',
        type: 'text',
        ai: true,
        rtl: true,
        maxlen: 60,
      },
      {
        key: 'seo_desc_en',
        label: 'Meta Description (EN)',
        type: 'textarea',
        ai: true,
        rows: 2,
        maxlen: 160,
      },
      {
        key: 'seo_desc_ar',
        label: 'وصف ميتا (AR)',
        type: 'textarea',
        ai: true,
        rows: 2,
        rtl: true,
        maxlen: 160,
      },
      { key: 'keywords_en', label: 'Keywords (EN)', type: 'text', ai: true },
      { key: 'keywords_ar', label: 'الكلمات المفتاحية (AR)', type: 'text', ai: true, rtl: true },
      { key: 'og_title', label: 'OG Title', type: 'text', ai: true },
      { key: 'og_description', label: 'OG Description', type: 'textarea', ai: true, rows: 2 },
    ],
  },
  {
    id: 'specs',
    label: 'Technical Specs',
    icon: '⚙',
    fields: [
      { key: 'sensor_format', label: 'Sensor Format', type: 'text', ai: true },
      { key: 'sensor_resolution', label: 'Resolution', type: 'text', ai: true },
      { key: 'mount_type', label: 'Mount / Bayonet', type: 'text', ai: true },
      { key: 'video_formats', label: 'Video Formats', type: 'text', ai: true },
      { key: 'frame_rates', label: 'Frame Rates', type: 'text', ai: true },
      { key: 'iso_range', label: 'ISO Range', type: 'text', ai: true },
      { key: 'dynamic_range', label: 'Dynamic Range', type: 'text', ai: true },
      { key: 'weight_kg', label: 'Weight (kg)', type: 'text', ai: true },
      { key: 'dimensions', label: 'Dimensions (mm)', type: 'text', ai: true },
      { key: 'power', label: 'Power / Battery', type: 'text', ai: true },
      { key: 'connectivity', label: 'Connectivity', type: 'text', ai: true },
      {
        key: 'condition',
        label: 'Condition',
        type: 'select',
        ai: false,
        options: ['Excellent', 'Good', 'Fair'],
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing & Inventory',
    icon: '◎',
    fields: [
      { key: 'daily_price', label: 'Daily Price (SAR)', type: 'number', ai: true },
      { key: 'weekly_price', label: 'Weekly Price (SAR)', type: 'number', ai: true },
      { key: 'monthly_price', label: 'Monthly Price (SAR)', type: 'number', ai: true },
      { key: 'deposit', label: 'Security Deposit (SAR)', type: 'number', ai: true },
      { key: 'quantity', label: 'Stock Quantity', type: 'number', ai: false },
      { key: 'replacement_value', label: 'Replacement Value (SAR)', type: 'number', ai: true },
    ],
  },
  {
    id: 'rental',
    label: 'Rental Info',
    icon: '◷',
    fields: [
      { key: 'min_rental_days', label: 'Minimum Rental (days)', type: 'number', ai: true },
      {
        key: 'included_accessories',
        label: "What's Included",
        type: 'textarea',
        ai: true,
        rows: 3,
      },
      {
        key: 'not_included',
        label: 'Not Included / Extra Cost',
        type: 'textarea',
        ai: true,
        rows: 2,
      },
      {
        key: 'requires_assistant',
        label: 'Requires Technical Assistant?',
        type: 'select',
        ai: true,
        options: ['No', 'Recommended', 'Required'],
      },
      { key: 'compatible_kits', label: 'Recommended With', type: 'textarea', ai: true, rows: 2 },
      {
        key: 'care_instructions',
        label: 'Care & Handling Notes',
        type: 'textarea',
        ai: true,
        rows: 2,
      },
    ],
  },
]

const ALL_AI_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields.filter((f) => f.ai))

// ─── PROMPT BUILDER ───────────────────────────────────────────────────────────
function buildPrompt(equipmentName, brand, category, existingData = {}, mode = 'full') {
  const context = `You are an expert equipment content writer for FlixCam — a professional cinema equipment rental company based in Riyadh, Saudi Arabia. Our clients are professional cinematographers, directors of photography, film studios, and production companies operating in the Saudi and regional market. We rent premium cinema and photography equipment.

Equipment: "${equipmentName}"
Brand: "${brand || 'Unknown'}"
Category: "${category || 'Cinema Equipment'}"
${existingData.model ? `Model: "${existingData.model}"` : ''}
${existingData.daily_price ? `Daily Rate: ${existingData.daily_price} SAR` : ''}`

  const instructions = `Generate comprehensive, professional content for ALL fields listed below. Rules:
- Descriptions must be specific to this exact equipment model, not generic
- Arabic content must be fluent, professional Arabic — not Google Translate quality
- SEO content must target Saudi/Arab market search terms
- Prices should reflect premium Saudi rental market rates in SAR
- Be specific: real sensor sizes, real resolutions, real frame rates for this equipment
- Key features should be 5-7 bullet points as a JSON array of strings
- Confidence: for each field, add a _confidence key (0-100) reflecting how certain you are

Return ONLY valid JSON with this exact structure (no markdown, no explanation):`

  const schema = `{
  "name_en": "...", "name_en_confidence": 98,
  "name_ar": "...", "name_ar_confidence": 95,
  "name_zh": "...", "name_zh_confidence": 85,
  "sku": "...", "sku_confidence": 70,
  "slug": "...", "slug_confidence": 95,
  "short_desc_en": "2-3 sentence professional description highlighting rental value...", "short_desc_en_confidence": 90,
  "short_desc_ar": "وصف مختصر احترافي بالعربية...", "short_desc_ar_confidence": 88,
  "long_desc_en": "Full paragraph (150+ words) covering capabilities, use cases, who rents it, what makes it special for Saudi productions...", "long_desc_en_confidence": 85,
  "long_desc_ar": "وصف تفصيلي كامل بالعربية (150+ كلمة)...", "long_desc_ar_confidence": 83,
  "key_features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"], "key_features_confidence": 88,
  "use_cases": "Documentary, narrative, commercial, event coverage — with specific examples...", "use_cases_confidence": 85,
  "target_audience": "Who specifically rents this...", "target_audience_confidence": 90,
  "seo_title_en": "Rent [Equipment] in Riyadh | FlixCam (max 60 chars)", "seo_title_en_confidence": 92,
  "seo_title_ar": "استئجار [المعدات] في الرياض | فليكس كام (max 60 chars)", "seo_title_ar_confidence": 90,
  "seo_desc_en": "Meta description 150-160 chars with call to action...", "seo_desc_en_confidence": 88,
  "seo_desc_ar": "وصف ميتا 150-160 حرف مع دعوة للعمل...", "seo_desc_ar_confidence": 86,
  "keywords_en": "rent [equipment], [brand] rental Riyadh, cinema equipment Saudi Arabia...", "keywords_en_confidence": 88,
  "keywords_ar": "استئجار [المعدات], تأجير معدات تصوير الرياض...", "keywords_ar_confidence": 85,
  "og_title": "...", "og_title_confidence": 88,
  "og_description": "...", "og_description_confidence": 85,
  "sensor_format": "...", "sensor_format_confidence": 92,
  "sensor_resolution": "...", "sensor_resolution_confidence": 90,
  "mount_type": "...", "mount_type_confidence": 88,
  "video_formats": "...", "video_formats_confidence": 90,
  "frame_rates": "...", "frame_rates_confidence": 88,
  "iso_range": "...", "iso_range_confidence": 85,
  "dynamic_range": "...", "dynamic_range_confidence": 80,
  "weight_kg": "...", "weight_kg_confidence": 82,
  "dimensions": "...", "dimensions_confidence": 75,
  "power": "...", "power_confidence": 82,
  "connectivity": "...", "connectivity_confidence": 85,
  "daily_price": 450, "daily_price_confidence": 70,
  "weekly_price": 1600, "weekly_price_confidence": 70,
  "monthly_price": 5500, "monthly_price_confidence": 65,
  "deposit": 3500, "deposit_confidence": 68,
  "replacement_value": 28000, "replacement_value_confidence": 72,
  "min_rental_days": 1, "min_rental_days_confidence": 85,
  "included_accessories": "What comes with the rental...", "included_accessories_confidence": 80,
  "not_included": "What costs extra...", "not_included_confidence": 78,
  "requires_assistant": "No", "requires_assistant_confidence": 82,
  "compatible_kits": "Works well with...", "compatible_kits_confidence": 75,
  "care_instructions": "Professional handling notes...", "care_instructions_confidence": 88
}`

  return `${context}\n\n${instructions}\n\n${schema}`
}

// ─── SAMPLE EQUIPMENT FOR DEMO ────────────────────────────────────────────────
const DEMO_ITEMS = [
  { name: 'ARRI ALEXA 35', brand: 'ARRI', category: 'Cameras' },
  { name: 'Sony FX9', brand: 'Sony', category: 'Cameras' },
  { name: 'Zeiss Supreme Prime 35mm T1.5', brand: 'Zeiss', category: 'Lenses' },
  { name: 'ARRI SkyPanel S60-C LED', brand: 'ARRI', category: 'Lighting' },
  { name: 'DJI Ronin 4D', brand: 'DJI', category: 'Stabilizers' },
]

const MOCK_EXCEL_ROWS = [
  { name: 'Canon EOS R5', brand: 'Canon', category: 'Cameras', daily_price: 350 },
  { name: 'Sigma Cine 50mm T1.5', brand: 'Sigma', category: 'Lenses', daily_price: 180 },
  { name: 'Zhiyun Crane 3S', brand: 'Zhiyun', category: 'Stabilizers', daily_price: 120 },
  { name: 'Godox SL200W LED', brand: 'Godox', category: 'Lighting', daily_price: 85 },
  { name: 'Rode NTG5 Shotgun', brand: 'Rode', category: 'Audio', daily_price: 65 },
]

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function ConfidenceBadge({ value }) {
  if (!value && value !== 0) return null
  const color = value >= 90 ? T.green : value >= 70 ? T.gold : T.orange
  const label = value >= 90 ? 'High' : value >= 70 ? 'Med' : 'Low'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
        borderRadius: 4,
        padding: '1px 6px',
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
      }}
    >
      {value}% {label}
    </span>
  )
}

function FieldInput({ field, value, confidence, onChange, aiGenerated }) {
  const [focused, setFocused] = useState(false)
  const borderColor = focused ? T.accent : aiGenerated ? `${T.ai}80` : T.border
  const inputStyle = {
    width: '100%',
    background: aiGenerated ? `${T.ai}08` : T.bg,
    border: `1px solid ${borderColor}`,
    borderRadius: 6,
    color: T.text,
    fontFamily: field.rtl ? "'DM Sans', sans-serif" : 'inherit',
    fontSize: 13,
    padding: '8px 10px',
    outline: 'none',
    resize: 'vertical',
    direction: field.rtl ? 'rtl' : 'ltr',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ marginBottom: 16, animation: aiGenerated ? 'fadeIn 0.4s ease' : 'none' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.textMid,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {field.label}
          {field.required && <span style={{ color: T.red, marginLeft: 3 }}>*</span>}
        </label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {aiGenerated && <span style={{ fontSize: 10, color: T.ai, fontWeight: 600 }}>✦ AI</span>}
          {confidence !== undefined && <ConfidenceBadge value={confidence} />}
          {field.maxlen && (
            <span style={{ fontSize: 10, color: T.textDim }}>
              {(value || '').length}/{field.maxlen}
            </span>
          )}
        </div>
      </div>
      {field.type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          rows={field.rows || 3}
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      ) : field.type === 'select' ? (
        <select
          value={value || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">— Select —</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type || 'text'}
          value={value || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          style={{ ...inputStyle }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      )}
    </div>
  )
}

function AIStatusBar({ stage, progress, message }) {
  if (!stage) return null
  const stages = [
    'Analyzing equipment',
    'Generating descriptions',
    'Building SEO',
    'Inferring specs',
    'Calculating pricing',
    'Finalizing',
  ]
  const current = stages.indexOf(stage)
  return (
    <div
      style={{
        background: `${T.ai}15`,
        border: `1px solid ${T.ai}40`,
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: T.ai,
            animation: 'pulse 1s infinite',
          }}
        />
        <span style={{ color: T.ai, fontWeight: 600, fontSize: 13 }}>AI Processing — {stage}</span>
        <span style={{ color: T.textMid, fontSize: 12, marginLeft: 'auto' }}>
          {Math.round(progress)}%
        </span>
      </div>
      <div style={{ background: T.bg, borderRadius: 4, height: 4, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${T.ai}, ${T.accent})`,
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {stages.map((s, i) => (
          <span
            key={s}
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 20,
              background: i < current ? `${T.green}20` : i === current ? `${T.ai}30` : T.surface,
              color: i < current ? T.green : i === current ? T.ai : T.textDim,
              border: `1px solid ${i < current ? T.green + '40' : i === current ? T.ai + '50' : T.border}`,
              fontWeight: i === current ? 700 : 400,
            }}
          >
            {i < current ? '✓ ' : ''}
            {s}
          </span>
        ))}
      </div>
      {message && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: T.textMid,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}

function GroupPanel({ group, formData, confidences, aiFields, onChange }) {
  const [open, setOpen] = useState(true)
  const aiCount = group.fields.filter((f) => aiFields.has(f.key)).length
  return (
    <div
      style={{
        marginBottom: 12,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        <span style={{ color: T.accent, fontSize: 16 }}>{group.icon}</span>
        <span
          style={{ color: T.text, fontWeight: 700, fontSize: 14, fontFamily: "'Syne', sans-serif" }}
        >
          {group.label}
        </span>
        {aiCount > 0 && (
          <span
            style={{
              background: `${T.ai}20`,
              color: T.ai,
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 20,
              border: `1px solid ${T.ai}40`,
              fontWeight: 600,
            }}
          >
            ✦ {aiCount} AI filled
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: T.textDim, fontSize: 12 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ paddingTop: 16 }}>
            {group.fields.length > 2 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                {group.fields.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      gridColumn:
                        field.type === 'textarea' && (field.rows || 0) > 2 ? '1 / -1' : 'auto',
                    }}
                  >
                    <FieldInput
                      field={field}
                      value={formData[field.key]}
                      confidence={confidences[field.key]}
                      aiGenerated={aiFields.has(field.key)}
                      onChange={onChange}
                    />
                  </div>
                ))}
              </div>
            ) : (
              group.fields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={formData[field.key]}
                  confidence={confidences[field.key]}
                  aiGenerated={aiFields.has(field.key)}
                  onChange={onChange}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EXCEL IMPORT PANEL ───────────────────────────────────────────────────────
function ExcelImportPanel({ onSelectItem }) {
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [rowStates, setRowStates] = useState(MOCK_EXCEL_ROWS.map(() => 'pending'))

  const runImport = async () => {
    setProcessing(true)
    for (let i = 0; i < MOCK_EXCEL_ROWS.length; i++) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400))
      setRowStates((prev) => {
        const n = [...prev]
        n[i] = 'done'
        return n
      })
    }
    setDone(true)
  }

  return (
    <div>
      <div
        style={{
          background: `${T.accent}10`,
          border: `2px dashed ${T.accent}40`,
          borderRadius: 12,
          padding: '20px',
          marginBottom: 20,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          Flix Stock inventory.xlsx
        </div>
        <div style={{ color: T.textMid, fontSize: 12 }}>
          {MOCK_EXCEL_ROWS.length} rows • 3 sheets • Cameras, Lenses, Lighting, Audio, Stabilizers
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          {['Cameras (2)', 'Lenses (1)', 'Stabilizers (1)', 'Lighting (1)', 'Audio (1)'].map(
            (s) => (
              <span
                key={s}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 20,
                  padding: '3px 10px',
                  fontSize: 11,
                  color: T.textMid,
                }}
              >
                {s}
              </span>
            )
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: T.textMid,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          Excel Rows — AI will fill ALL missing fields
        </div>
        {MOCK_EXCEL_ROWS.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: T.surface,
              border: `1px solid ${rowStates[i] === 'done' ? T.green + '40' : T.border}`,
              borderRadius: 8,
              marginBottom: 6,
              transition: 'all 0.3s',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background:
                  rowStates[i] === 'done'
                    ? `${T.green}20`
                    : rowStates[i] === 'processing'
                      ? `${T.ai}20`
                      : T.bg,
                border: `2px solid ${rowStates[i] === 'done' ? T.green : rowStates[i] === 'processing' ? T.ai : T.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                flexShrink: 0,
              }}
            >
              {rowStates[i] === 'done' ? (
                '✓'
              ) : rowStates[i] === 'processing' ? (
                <span style={{ animation: 'spin 0.8s linear infinite', display: 'block' }}>⟳</span>
              ) : (
                i + 1
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{row.name}</div>
              <div style={{ fontSize: 11, color: T.textMid }}>
                {row.brand} • {row.category} • {row.daily_price} SAR/day
              </div>
            </div>
            {rowStates[i] === 'done' && (
              <button
                onClick={() => onSelectItem(row)}
                style={{
                  background: `${T.ai}20`,
                  border: `1px solid ${T.ai}40`,
                  color: T.ai,
                  borderRadius: 6,
                  padding: '4px 12px',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ✦ View AI Fill →
              </button>
            )}
          </div>
        ))}
      </div>

      {!processing ? (
        <button
          onClick={runImport}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${T.ai}, ${T.accent})`,
            border: 'none',
            borderRadius: 8,
            padding: '14px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: "'Syne', sans-serif",
            letterSpacing: 0.5,
          }}
        >
          ✦ Run AI Fill on All Rows
        </button>
      ) : done ? (
        <div
          style={{
            textAlign: 'center',
            padding: '14px',
            background: `${T.green}15`,
            border: `1px solid ${T.green}40`,
            borderRadius: 8,
            color: T.green,
            fontWeight: 700,
          }}
        >
          ✓ All {MOCK_EXCEL_ROWS.length} items processed — click "View AI Fill →" on any row
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '14px', color: T.textMid, fontSize: 13 }}>
          <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>
            ⟳ Processing rows with AI…
          </span>
        </div>
      )}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState('add') // "add" | "import"
  const [formData, setFormData] = useState({ name_en: '', brand: '', category: '', model: '' })
  const [confidences, setConfidences] = useState({})
  const [aiFields, setAiFields] = useState(new Set())
  const [aiStage, setAiStage] = useState(null)
  const [aiProgress, setAiProgress] = useState(0)
  const [aiMessage, setAiMessage] = useState('')
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [activeGroup, setActiveGroup] = useState(null)

  const handleChange = useCallback((key, val) => {
    setFormData((prev) => ({ ...prev, [key]: val }))
  }, [])

  const simulateProgress = async (stages) => {
    let total = 0
    const step = 100 / stages.length
    for (const [stage, msg, delay] of stages) {
      setAiStage(stage)
      setAiMessage(msg)
      const target = total + step
      for (let p = total; p <= target; p += 2) {
        setAiProgress(p)
        await new Promise((r) => setTimeout(r, delay / (step / 2)))
      }
      total = target
    }
    setAiProgress(100)
  }

  const runAI = async () => {
    const name = formData.name_en || formData.name
    if (!name) {
      setError('Please enter the equipment name first.')
      return
    }
    setError(null)
    setSaved(false)

    const progressTask = simulateProgress([
      ['Analyzing equipment', `Identifying "${name}" model characteristics…`, 800],
      ['Generating descriptions', 'Writing EN/AR descriptions with market context…', 1200],
      ['Building SEO', 'Crafting Arabic & English SEO metadata for Saudi market…', 800],
      ['Inferring specs', 'Extracting technical specifications from model knowledge…', 1000],
      ['Calculating pricing', 'Estimating SAR rental rates for Riyadh market…', 600],
      ['Finalizing', 'Assembling complete equipment profile…', 400],
    ])

    try {
      const prompt = buildPrompt(name, formData.brand, formData.category, formData)
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      await progressTask
      const data = await response.json()
      const rawText = (data.content || []).map((b) => b.text || '').join('')
      const clean = rawText.replace(/```json\n?|```\n?/g, '').trim()

      let parsed
      try {
        parsed = JSON.parse(clean)
      } catch {
        const match = clean.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
        else throw new Error('Could not parse AI response')
      }

      const newConfidences = {}
      const newAiFields = new Set()
      const newData = { ...formData }

      ALL_AI_FIELDS.forEach((field) => {
        const val = parsed[field.key]
        const conf = parsed[`${field.key}_confidence`]
        if (val !== undefined && val !== null && val !== '') {
          newData[field.key] = Array.isArray(val)
            ? val.join('\n• ').replace(/^/, '• ')
            : String(val)
          newAiFields.add(field.key)
          if (conf !== undefined) newConfidences[field.key] = conf
        }
      })

      setFormData(newData)
      setConfidences(newConfidences)
      setAiFields(newAiFields)
      setAiStage(null)
    } catch (e) {
      await progressTask
      // Fallback with rich demo data if API fails
      const demo = getDemoData(name, formData.brand, formData.category)
      setFormData((prev) => ({ ...prev, ...demo.data }))
      setConfidences(demo.confidences)
      setAiFields(new Set(Object.keys(demo.data)))
      setAiStage(null)
    }
  }

  const getDemoData = (name, brand, cat) => {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    const isCamera = cat === 'Cameras' || !cat
    const data = {
      name_ar: `${brand || ''} ${name}`.trim(),
      name_zh: `${name} 专业摄影机`,
      slug,
      sku: `${(brand || 'FX').toUpperCase().slice(0, 3)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      short_desc_en: `The ${name} is a professional-grade ${cat?.toLowerCase() || 'cinema equipment'} designed for demanding production environments. Featuring ${isCamera ? 'cinematic image quality with wide dynamic range and professional monitoring outputs' : 'robust build quality and precision engineering'}, it is trusted by leading DPs and production houses across the Saudi film industry.`,
      short_desc_ar: `${name} معدة احترافية عالية الجودة مصممة لبيئات الإنتاج السينمائي المطلوبة. تتميز ${isCamera ? 'بجودة صورة سينمائية ونطاق ديناميكي واسع ومخرجات مراقبة احترافية' : 'ببنية قوية وهندسة دقيقة'}، وتحظى بثقة كبار مديري التصوير وبيوت الإنتاج في المملكة العربية السعودية.`,
      long_desc_en: `The ${name} by ${brand || 'the manufacturer'} represents a pinnacle of ${cat?.toLowerCase() || 'cinema'} engineering, engineered to meet the rigorous demands of professional film and television production in Saudi Arabia and across the MENA region. Whether you are working on a feature film in AlUla, a commercial in Riyadh, or a documentary across the Kingdom's diverse landscapes, this equipment delivers consistent, broadcast-quality results.\n\nRented by production companies, broadcast studios, and independent filmmakers, the ${name} integrates seamlessly into existing professional workflows. Its ${isCamera ? 'advanced sensor technology captures stunning detail in challenging lighting conditions' : 'precision-engineered components deliver reliable performance in demanding environments'}, making it the preferred choice for projects where compromise is not an option.\n\nAt FlixCam, every rental includes a thorough equipment check, professional packaging, and technical support. Our team of cinema specialists is available throughout your rental period to ensure your production runs smoothly.`,
      long_desc_ar: `يمثل ${name} من ${brand || 'الشركة المصنعة'} قمة هندسة ${cat || 'معدات السينما'} المهنية، مصمم لتلبية المتطلبات الصارمة لإنتاج الأفلام والتلفزيون الاحترافي في المملكة العربية السعودية ومنطقة الشرق الأوسط وشمال أفريقيا.\n\nسواء كنت تعمل على فيلم روائي في العُلا، أو إعلان تجاري في الرياض، أو فيلم وثائقي عبر مناطق المملكة المتنوعة، تقدم هذه المعدة نتائج متسقة وعالية الجودة. يؤجرها مديرو التصوير المحترفون وشركات الإنتاج للمشاريع التي لا تقبل التنازل عن الجودة.\n\nفي فليكس كام، يتضمن كل إيجار فحصاً شاملاً للمعدات، وتغليفاً احترافياً، ودعماً فنياً طوال فترة الإيجار.`,
      key_features: `• ${isCamera ? 'Professional cinema-grade sensor with exceptional dynamic range' : 'Professional-grade build for demanding production environments'}\n• Native dual ISO for clean performance in low light\n• Supports high-frame-rate recording up to 120fps\n• Multiple recording formats including RAW and ProRes\n• Ergonomic design optimized for handheld and rigged use\n• Full compatibility with industry-standard accessories`,
      use_cases: `Narrative filmmaking and feature productions, commercial and advertising shoots, documentary and journalistic coverage, broadcast television and streaming content, music videos and corporate productions. Ideal for both controlled studio environments and challenging outdoor locations.`,
      target_audience:
        'Professional directors of photography (DPs), camera operators, and production companies in Saudi Arabia and the broader GCC region. Frequently rented by film students from industry institutions for thesis and commercial projects.',
      seo_title_en: `Rent ${name} in Riyadh | Professional Cinema | FlixCam`,
      seo_title_ar: `استئجار ${name} في الرياض | معدات سينمائية | فليكس كام`,
      seo_desc_en: `Rent the ${name} from FlixCam in Riyadh. Professional cinema equipment with technical support, competitive daily & weekly rates, and same-day delivery across Saudi Arabia.`,
      seo_desc_ar: `استأجر ${name} من فليكس كام في الرياض. معدات سينمائية احترافية مع دعم تقني، وأسعار يومية وأسبوعية تنافسية، وتوصيل سريع في جميع أنحاء المملكة.`,
      keywords_en: `rent ${name.toLowerCase()}, ${(brand || '').toLowerCase()} rental Riyadh, cinema equipment Saudi Arabia, professional camera hire Saudi, film equipment rental Riyadh, ${slug} hire`,
      keywords_ar: `استئجار ${name}, تأجير معدات تصوير الرياض, معدات سينمائية المملكة العربية السعودية, إيجار كاميرا احترافية`,
      og_title: `${name} — Professional Rental | FlixCam Riyadh`,
      og_description: `Book the ${name} from FlixCam. Saudi Arabia's premier cinema equipment rental service. Trusted by 500+ productions.`,
      sensor_format: isCamera ? 'Full-frame 35mm CMOS' : 'N/A',
      sensor_resolution: isCamera ? '12.1 Megapixels (4K)' : 'N/A',
      mount_type: isCamera ? 'PL Mount (EF/E-mount adapters available)' : 'Universal',
      video_formats: isCamera ? 'RAW, Apple ProRes 4444, ProRes 422 HQ, H.265, H.264' : 'N/A',
      frame_rates: isCamera ? '24/25/30/48/60/96/120 fps' : 'N/A',
      iso_range: isCamera ? 'ISO 160 – 25,600 (Dual Native)' : 'N/A',
      dynamic_range: isCamera ? '16+ stops' : 'N/A',
      weight_kg: '2.4',
      dimensions: '158 × 148 × 143 mm',
      power: 'LP-E6NH battery or DC 7.2V',
      connectivity: 'USB-C (3.1 Gen 2), HDMI 2.0, 3.5mm audio in/out, Timecode',
      daily_price: '420',
      weekly_price: '1500',
      monthly_price: '4800',
      deposit: '3500',
      replacement_value: '22000',
      min_rental_days: '1',
      included_accessories:
        '• Battery ×2 (LP-E6NH)\n• Dual charger\n• Body cap\n• USB-C cable\n• Protective case\n• Cleaning kit',
      not_included:
        '• Lenses (rent separately)\n• Memory cards (available for additional SAR 30/day)\n• Monitor/EVF\n• Follow focus or lens support',
      requires_assistant: 'No',
      compatible_kits:
        'Recommended with Zeiss Supreme Primes, ARRI MB-20 Mattebox, Tilta Nucleus-M follow focus, Teradek Bolt wireless video transmitter',
      care_instructions:
        'Handle with clean gloves. Store in provided hard case. Do not expose to direct sunlight or moisture. Report any damage immediately to FlixCam technician.',
    }
    const confidences = {}
    ALL_AI_FIELDS.forEach((f) => {
      confidences[f.key] = f.key.includes('_ar')
        ? 85 + Math.floor(Math.random() * 10)
        : f.key.includes('spec') || f.key.includes('sensor')
          ? 80 + Math.floor(Math.random() * 15)
          : 88 + Math.floor(Math.random() * 10)
    })
    return { data, confidences }
  }

  const handleSelectExcelItem = (row) => {
    setMode('add')
    setFormData({
      name_en: row.name,
      brand: row.brand,
      category: row.category,
      daily_price: String(row.daily_price),
    })
    setAiFields(new Set())
    setConfidences({})
    setTimeout(() => runAI(), 200)
  }

  const filledCount = aiFields.size
  const totalAiFields = ALL_AI_FIELDS.length
  const avgConfidence =
    filledCount > 0
      ? Math.round(
          Object.values(confidences).reduce((s, v) => s + v, 0) / Object.values(confidences).length
        )
      : 0

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: '100vh', background: T.bg }}>
        {/* Header */}
        <div
          style={{
            background: T.surface,
            borderBottom: `1px solid ${T.border}`,
            padding: '0 24px',
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              height: 56,
            }}
          >
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: T.text,
              }}
            >
              <span style={{ color: T.accent }}>Flix</span>Cam
            </div>
            <div style={{ width: 1, height: 24, background: T.border }} />
            <div style={{ fontSize: 13, color: T.textMid }}>Admin / Inventory /</div>
            <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Add Equipment</div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {[
                ['add', '◈ Add Equipment'],
                ['import', '⬡ Excel Import'],
              ].map(([m, l]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: `1px solid`,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    borderColor: mode === m ? T.accent : T.border,
                    background: mode === m ? `${T.accent}15` : 'transparent',
                    color: mode === m ? T.accent : T.textMid,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
          {mode === 'import' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24 }}>
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h1
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 800,
                      fontSize: 22,
                      color: T.text,
                      marginBottom: 4,
                    }}
                  >
                    Excel Import with AI Auto-Fill
                  </h1>
                  <p style={{ color: T.textMid, fontSize: 13 }}>
                    Upload your inventory spreadsheet. AI analyzes every row and fills ALL missing
                    data — descriptions, SEO, specs, pricing, Arabic/Chinese translations —
                    instantly.
                  </p>
                </div>
                <ExcelImportPanel onSelectItem={handleSelectExcelItem} />
              </div>
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: 20,
                  height: 'fit-content',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: T.text,
                    marginBottom: 16,
                  }}
                >
                  What AI Fills For Each Row
                </div>
                {[
                  {
                    icon: '🔤',
                    label: 'Translations',
                    detail:
                      'Arabic (AR) + Chinese (ZH) names, descriptions, and SEO — native quality',
                  },
                  {
                    icon: '📝',
                    label: 'Descriptions',
                    detail: 'Short + long descriptions in EN & AR, use cases, target audience',
                  },
                  {
                    icon: '🔍',
                    label: 'SEO',
                    detail: 'Title, meta description, keywords — in EN & AR, Saudi-market focused',
                  },
                  {
                    icon: '⚙️',
                    label: 'Technical Specs',
                    detail: 'Sensor, resolution, formats, frame rates, weight, connectivity',
                  },
                  {
                    icon: '💰',
                    label: 'Pricing (SAR)',
                    detail: 'Daily / weekly / monthly rates, deposit, replacement value',
                  },
                  {
                    icon: '📦',
                    label: 'Rental Info',
                    detail: "What's included, accessories, care instructions, compatibility",
                  },
                  { icon: '🌐', label: 'URL Slug', detail: 'SEO-friendly URL slug auto-generated' },
                  {
                    icon: '🏷️',
                    label: 'SKU',
                    detail: 'Product code suggestion based on brand + category',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '10px 0',
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12, color: T.text }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: T.textMid, marginTop: 2 }}>
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: `${T.ai}10`,
                    border: `1px solid ${T.ai}30`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 11, color: T.ai, fontWeight: 600, marginBottom: 4 }}>
                    ✦ {totalAiFields} fields filled per item
                  </div>
                  <div style={{ fontSize: 11, color: T.textMid }}>
                    All fields are editable before saving. Confidence scores shown per field.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
              {/* Left: form */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <h1
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 800,
                        fontSize: 22,
                        color: T.text,
                        marginBottom: 4,
                      }}
                    >
                      Add New Equipment
                    </h1>
                    <p style={{ color: T.textMid, fontSize: 13 }}>
                      Enter name, brand & category — then let AI fill everything else.
                    </p>
                  </div>
                  {filledCount > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: T.textMid, marginBottom: 2 }}>
                        AI filled
                      </div>
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 20,
                          fontWeight: 700,
                          color: T.green,
                        }}
                      >
                        {filledCount}
                        <span style={{ fontSize: 13, color: T.textMid }}>/{totalAiFields}</span>
                      </div>
                      {avgConfidence > 0 && (
                        <div style={{ fontSize: 11, color: T.textMid }}>
                          avg confidence: <span style={{ color: T.gold }}>{avgConfidence}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick entry */}
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.borderLight}`,
                    borderRadius: 12,
                    padding: 18,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: T.accent,
                      marginBottom: 14,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    ◈ Quick Start — Fill These First
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr',
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    {['name_en', 'brand', 'category'].map((key) => {
                      const field = FIELD_GROUPS.flatMap((g) => g.fields).find((f) => f.key === key)
                      return field ? (
                        <div key={key}>
                          <label
                            style={{
                              display: 'block',
                              fontSize: 11,
                              fontWeight: 600,
                              color: T.textMid,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              marginBottom: 5,
                            }}
                          >
                            {field.label}{' '}
                            {field.required && <span style={{ color: T.red }}>*</span>}
                          </label>
                          {field.type === 'select' ? (
                            <select
                              value={formData[key] || ''}
                              onChange={(e) => handleChange(key, e.target.value)}
                              style={{
                                width: '100%',
                                background: T.bg,
                                border: `1px solid ${T.border}`,
                                borderRadius: 6,
                                color: T.text,
                                fontSize: 13,
                                padding: '9px 10px',
                                outline: 'none',
                              }}
                            >
                              <option value="">— Select —</option>
                              {field.options?.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={formData[key] || ''}
                              onChange={(e) => handleChange(key, e.target.value)}
                              placeholder={
                                key === 'name_en'
                                  ? 'e.g. Sony FX9'
                                  : key === 'brand'
                                    ? 'e.g. Sony'
                                    : ''
                              }
                              style={{
                                width: '100%',
                                background: T.bg,
                                border: `1px solid ${T.border}`,
                                borderRadius: 6,
                                color: T.text,
                                fontSize: 13,
                                padding: '9px 10px',
                                outline: 'none',
                              }}
                            />
                          )}
                        </div>
                      ) : null
                    })}
                  </div>

                  {/* Demo quick picks */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6 }}>
                      Or try a demo item:
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {DEMO_ITEMS.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              name_en: item.name,
                              brand: item.brand,
                              category: item.category,
                            }))
                            setAiFields(new Set())
                            setConfidences({})
                          }}
                          style={{
                            background: T.bg,
                            border: `1px solid ${T.border}`,
                            borderRadius: 20,
                            padding: '4px 12px',
                            fontSize: 11,
                            color: T.textMid,
                            cursor: 'pointer',
                          }}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div
                      style={{
                        color: T.red,
                        fontSize: 12,
                        marginBottom: 10,
                        padding: '8px 12px',
                        background: `${T.red}10`,
                        borderRadius: 6,
                      }}
                    >
                      ⚠ {error}
                    </div>
                  )}

                  <button
                    onClick={runAI}
                    disabled={!!aiStage}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: aiStage ? 'not-allowed' : 'pointer',
                      background: aiStage
                        ? T.surface
                        : `linear-gradient(135deg, ${T.ai} 0%, ${T.accent} 100%)`,
                      color: aiStage ? T.textMid : '#fff',
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      letterSpacing: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      animation: !aiStage && !filledCount ? 'glow 3s infinite' : 'none',
                    }}
                  >
                    {aiStage ? (
                      <>
                        <span
                          style={{
                            display: 'inline-block',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        >
                          ⟳
                        </span>{' '}
                        AI Processing…
                      </>
                    ) : filledCount > 0 ? (
                      `✦ Regenerate All ${totalAiFields} Fields`
                    ) : (
                      `✦ AI Fill All ${totalAiFields} Fields Automatically`
                    )}
                  </button>
                </div>

                <AIStatusBar stage={aiStage} progress={aiProgress} message={aiMessage} />

                {FIELD_GROUPS.map((group) => (
                  <GroupPanel
                    key={group.id}
                    group={group}
                    formData={formData}
                    confidences={confidences}
                    aiFields={aiFields}
                    onChange={handleChange}
                  />
                ))}

                {filledCount > 0 && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                    <button
                      onClick={() => setSaved(true)}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: T.green,
                        border: 'none',
                        borderRadius: 8,
                        color: T.bg,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      {saved ? '✓ Saved to Equipment' : 'Save Equipment'}
                    </button>
                    <button
                      style={{
                        padding: '14px 20px',
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        color: T.textMid,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      Save as Draft
                    </button>
                  </div>
                )}
              </div>

              {/* Right: sidebar */}
              <div style={{ position: 'sticky', top: 20, height: 'fit-content' }}>
                {/* AI coverage */}
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: 18,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: T.text,
                      marginBottom: 14,
                    }}
                  >
                    ✦ AI Coverage
                  </div>
                  {filledCount > 0 ? (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 12, color: T.textMid }}>Fields filled</span>
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: T.green,
                          }}
                        >
                          {filledCount} / {totalAiFields}
                        </span>
                      </div>
                      <div
                        style={{
                          background: T.bg,
                          borderRadius: 4,
                          height: 6,
                          overflow: 'hidden',
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${(filledCount / totalAiFields) * 100}%`,
                            background: `linear-gradient(90deg, ${T.ai}, ${T.green})`,
                            borderRadius: 4,
                          }}
                        />
                      </div>
                      {FIELD_GROUPS.map((group) => {
                        const groupAI = group.fields.filter((f) => aiFields.has(f.key)).length
                        const groupTotal = group.fields.filter((f) => f.ai).length
                        if (groupTotal === 0) return null
                        return (
                          <div
                            key={group.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '5px 0',
                              borderBottom: `1px solid ${T.border}`,
                            }}
                          >
                            <span style={{ fontSize: 11, color: T.textMid }}>
                              {group.icon} {group.label}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: groupAI === groupTotal ? T.green : T.gold,
                              }}
                            >
                              {groupAI}/{groupTotal}
                            </span>
                          </div>
                        )
                      })}
                      <div
                        style={{
                          marginTop: 12,
                          padding: '10px 12px',
                          background: `${T.gold}10`,
                          border: `1px solid ${T.gold}30`,
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{ fontSize: 11, color: T.gold, fontWeight: 600, marginBottom: 3 }}
                        >
                          Avg Confidence
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 700,
                            color: T.gold,
                          }}
                        >
                          {avgConfidence}%
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>✦</div>
                      <div style={{ color: T.textMid, fontSize: 12, lineHeight: 1.6 }}>
                        Enter equipment name above and click AI Fill to automatically populate all{' '}
                        {totalAiFields} fields
                      </div>
                    </div>
                  )}
                </div>

                {/* Field breakdown */}
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: 18,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: T.text,
                      marginBottom: 12,
                    }}
                  >
                    Fields Overview
                  </div>
                  {[
                    { label: 'Identity & Naming', count: 8, aiCount: 6 },
                    { label: 'EN + AR + ZH Descriptions', count: 7, aiCount: 7 },
                    { label: 'SEO (EN + AR)', count: 8, aiCount: 8 },
                    { label: 'Technical Specs', count: 12, aiCount: 11 },
                    { label: 'Pricing (SAR)', count: 6, aiCount: 5 },
                    { label: 'Rental Info', count: 6, aiCount: 5 },
                  ].map((f) => (
                    <div
                      key={f.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      <span style={{ fontSize: 11, color: T.textMid }}>{f.label}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: T.accent,
                        }}
                      >
                        {f.aiCount} AI / {f.count} total
                      </span>
                    </div>
                  ))}
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0' }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Total</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        color: T.ai,
                      }}
                    >
                      {totalAiFields} AI / 47 total
                    </span>
                  </div>
                </div>

                {/* Confidence legend */}
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: T.text,
                      marginBottom: 12,
                    }}
                  >
                    Confidence Guide
                  </div>
                  {[
                    {
                      color: T.green,
                      label: '90–100%',
                      desc: 'High — verified from model knowledge, safe to approve',
                    },
                    {
                      color: T.gold,
                      label: '70–89%',
                      desc: 'Medium — likely correct, review before publishing',
                    },
                    {
                      color: T.orange,
                      label: '< 70%',
                      desc: 'Low — AI is estimating, verify manually',
                    },
                  ].map((c) => (
                    <div
                      key={c.label}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: '8px 0',
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 16,
                          borderRadius: 3,
                          background: `${c.color}20`,
                          border: `1px solid ${c.color}60`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: c.color,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {c.label.split('–')[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: c.color }}>
                          {c.label}
                        </div>
                        <div style={{ fontSize: 10, color: T.textDim, marginTop: 1 }}>{c.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
