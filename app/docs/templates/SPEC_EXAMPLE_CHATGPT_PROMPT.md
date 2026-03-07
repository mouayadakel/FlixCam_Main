# Equipment Specs Example — For ChatGPT (Short, Full, Technician)

Use the prompt and example below so ChatGPT (or any LLM) outputs specs in the format your rental platform expects: **short** (highlights), **full** (customer-facing list), and **technician** (detailed technical).

---

## Copy-paste prompt for ChatGPT

```
You are a cinema equipment specialist. For the product I give you, output specs in THREE blocks:

1. SHORT SPECS — 3 to 5 bullet points for customers (rental highlights, key features, typical use). One line each. No units unless essential.

2. FULL SPECS — A complete, customer-friendly list. Use these rules:
   - Dimensions: exact mm or cm with context (e.g. "Super 35mm (24.6 × 13.8 mm)")
   - Resolution/video: list modes with pixel counts (e.g. "4096 × 2160 (4K DCI) / 3840 × 2160 (4K UHD)")
   - Codecs: full names and ratios (e.g. "XAVC S (4:2:2 10-bit) / BRAW 5:1")
   - Ranges: full range + expand if any (e.g. "ISO 80–102,400 (expandable to 409,600)")
   - Weight: exact with condition (e.g. "0.64 kg (body only)")
   - Power: voltage and wattage (e.g. "7.2V / 11.4 Wh")
   - Use keys in snake_case (e.g. sensor_size, max_video_resolution, weight_kg). One key per line, value after a colon or equals.

3. TECHNICIAN SPECS — Same keys as full, but values are precise for technicians: standards (Rec. 709, DCI-P3), tolerances (±2 dB), flange distance in mm, exact connector types (HDMI 2.1, SDI 12G), frame rates per resolution, and any calibration or compatibility notes.

Format: plain text or JSON-like key: value. No "unknown" or "N/A" — use best professional estimate or [verify] if unsure.
```

---

## Example product: Sony FX3

**Product:** Sony FX3 (full-frame cinema line camera)

---

### 1. SHORT SPECS (customer highlights)

- Full-frame 12.1 MP Exmor R sensor, 4K 60p, 10-bit 4:2:2.
- S-Cinetone and S-Log3; dual base ISO 80 / 3200, 14+ stops dynamic range.
- Compact body (0.64 kg), XLR handle, no built-in EVF; ideal for gimbal and documentary.
- Sony E-mount; CFexpress Type A / SD UHS-II; HDMI 2.1, timecode, USB streaming.
- Rent for music videos, commercials, and run-and-gun cinema.

---

### 2. FULL SPECS (customer-facing, structured)

```
sensor_size: Full frame 35.7 × 23.8 mm (35.6 mm diagonal)
sensor_type: Exmor R CMOS, 12.1 MP effective
resolution: 3840 × 2160 (4K UHD) / 4096 × 2160 (4K DCI)
max_video_resolution: 4096 × 2160 (4K DCI) up to 60p
max_framerate: 60 fps (4K) / 120 fps (1080p)
codec: XAVC S (4:2:2 10-bit) / XAVC S-I (4:2:2 10-bit) / XAVC S 4K
log_gamma: S-Log3, S-Log2, S-Cinetone
dynamic_range_stops: 14+ stops (S-Log3)
base_iso: 80 (S-Log3) / 3200 (dual native)
max_iso: 409,600 (expandable)
color_science: S-Gamut3, S-Gamut3.Cine, Rec. 709
mount_type: Sony E-mount
weight_kg: 0.64 kg (body only)
dimensions_cm: 12.9 × 7.7 × 8.5 cm (W × H × D)
media_type: CFexpress Type A, SD UHS-II
hdmi_output: 1× HDMI 2.1 (4K60 4:2:2 10-bit)
audio_inputs: 2× XLR (via handle), 3.5 mm mic
battery_type: NP-FZ100 compatible
weather_sealed: Yes (dust and moisture resistant)
```

---

### 3. TECHNICIAN SPECS (precise for crew and rental)

```
sensor_size: Full frame 35.7 × 23.8 mm (35.6 mm diagonal), 3:2 stills crop
sensor_type: Exmor R back-illuminated CMOS, 12.1 MP (4240 × 2832)
effective_pixels: 12.1 MP
resolution: 4096 × 2160 (DCI) / 3840 × 2160 (UHD) / 1920 × 1080
max_video_resolution: 4096 × 2160 (DCI) 24/25/30/60p; 3840 × 2160 24/25/30/60/120p
max_framerate: 60 fps (4K) / 120 fps (1080p)
max_framerate_4k: 60 fps
max_framerate_1080p: 120 fps
codec: XAVC S (Long GOP 4:2:2 10-bit), XAVC S-I (All-I 4:2:2 10-bit), XAVC S 4K
internal_codec: XAVC S, XAVC S-I (no RAW internal)
external_codec: RAW output via HDMI (16-bit, compatible recorders)
log_gamma: S-Log3 (ISO 640 min), S-Log2, S-Cinetone
dynamic_range_stops: 14+ stops (S-Log3, measured at SNR 2)
dual_native_iso: 80 and 3200 (S-Log3)
base_iso: 80 / 3200
max_iso: 102,400 (native), 409,600 (expandable)
color_science: S-Gamut3, S-Gamut3.Cine, Rec. 709; DCI-P3 via LUT
rolling_shutter: Yes (no global shutter)
mount_type: Sony E-mount
flange_distance: 18 mm
weight_kg: 0.64 kg (body only, no battery/card)
weight_body_only: 0.64 kg
dimensions_cm: 12.9 × 7.7 × 8.5 cm (W × H × D, body)
media_type: Dual slot: CFexpress Type A, SD UHS-II
card_slots: 2 (CFexpress Type A + SD)
hdmi_output: 1× HDMI Type A (full size), 4K60 4:2:2 10-bit, 4K120 4:2:0 10-bit
hdmi_version: HDMI 2.1
timecode_io: Yes (TC in/out via multi-interface shoe)
audio_inputs: 2× XLR/line (via XLR handle), 3.5 mm stereo mic
audio_input_type: XLR (switchable mic/line), 3.5 mm
headphone_jack: 3.5 mm
battery_type: NP-FZ100 (7.2V, 16.4 Wh)
power_draw_watts: ~6.5 W typical (record)
weather_sealed: Yes (dust and moisture resistant, no rating printed)
operating_temp: 0 °C to 40 °C
control_protocol: USB streaming (UVC), remote via multi-interface
```

---

## How to use this with ChatGPT

1. **Paste the prompt** (the first code block) into ChatGPT.
2. **Then say:**  
   “Product: [name and brief description, e.g. Sony FX3 full-frame cinema camera]”
3. **Ask for format:**  
   “Give me short specs, full specs, and technician specs as in the example.”
4. **Optional:**  
   “Output full and technician specs as a flat list: key: value, one per line.”

You can reuse the same prompt for lenses, lights, audio, monitors, etc.; ChatGPT will adapt keys (e.g. focal_length, max_aperture for lenses; output_watts, CRI for lights).
