# Resources AI Should Search for Equipment Specs

Use this list when prompting ChatGPT or any AI to look up or verify cinema/photo/video equipment specifications. Prefer **official manufacturer** and **trusted retailer/editorial** sources.

---

## 1. Official manufacturer sites (primary)

| Brand / category | URL pattern / main site | Notes |
|------------------|-------------------------|--------|
| **Sony** (cameras, lenses) | https://www.sony.com/electronics/support (support) / product pages under sony.com | Product pages have “Specifications” tab; support has manuals and spec sheets |
| **Canon** | https://www.canon.com/ (global) / canon-europe.com, usa.canon.com | “Specifications” section on each product page |
| **Nikon** | https://www.nikon.com/ | Product → Specs / Technical data |
| **Panasonic** (Lumix, broadcast) | https://www.panasonic.com/ | Camcorders, cinema (BS1H, S1H, etc.) |
| **Fujifilm** | https://www.fujifilm.com/ | X-mount cameras, lenses, GFX |
| **Blackmagic Design** | https://www.blackmagicdesign.com/ | Cameras, ATEM, DaVinci, monitors – full tech specs |
| **ARRI** | https://www.arri.com/ | Cameras, lenses, lights – detailed PDF spec sheets |
| **RED** | https://www.red.com/ | Camera bodies, specs and whitepapers |
| **DJI** | https://www.dji.com/ | Ronin, gimbals, drones, Osmo – product specs |
| **Sigma** | https://www.sigma-global.com/ (global) / sigmaphoto.com | Lenses: full optical and mechanical specs |
| **Tamron** | https://www.tamron.com/ | Lenses: specs and compatibility |
| **Zeiss** | https://www.zeiss.com/consumer-products (cine/photo) | Lenses: T-stops, coverage, weight |
| **Angenieux** | https://www.angenieux.com/ | Cine zooms – official spec PDFs |
| **Aputure** | https://www.aputure.com/ | Lights (LS, MC, etc.) – output, CCT, CRI |
| **Nanlux** / **Nanlite** | https://www.nanlux.com/ / nanlite.com | Evoke, etc. – power, output, compatibility |
| **Godox** | https://www.godox.com/ | Strobes, LED, output and compatibility |
| **Profoto** | https://www.profoto.com/ | Lighting – power, recycle, HSS |
| **SmallHD** | https://www.smallhd.com/ | Monitors – resolution, brightness, inputs |
| **Atomos** | https://www.atomos.com/ | Monitors/recorders – codecs, I/O, brightness |
| **Teradek** | https://www.teradek.com/ | Wireless video – range, latency, resolution |
| **Rode** | https://www.rode.com/ | Mics, boom kits – polar pattern, powering |
| **Sennheiser** | https://www.sennheiser.com/ | Wireless, mics – frequency range, specs |
| **Zoom** | https://www.zoom.co.jp/ (global) / zoom.com | Recorders, F series – channels, format, power |
| **Manfrotto** | https://www.manfrotto.com/ | Tripods, heads – load, height, weight |
| **Tilta** | https://www.tilta.com/ | Cages, gimbals, FIZ – payload, compatibility |

---

## 2. Trusted retailers (specs + compatibility)

| Site | URL | Why use |
|------|-----|--------|
| **B&H Photo** | https://www.bhphotovideo.com/ | Detailed “Specifications” tab; often more complete than some brand sites |
| **Adorama** | https://www.adorama.com/ | Specs and “Key features” for many products |
| **CVP** (UK/EU) | https://www.cvp.com/ | Cinema-focused; good for broadcast/cine cameras and lenses |
| **CineGear** (regional) | Local / cvp.com, bhphoto, etc. | Same products, cross-check specs |

---

## 3. Editorial / review sites (verified specs)

| Site | URL | Use for |
|------|-----|--------|
| **CineD** | https://www.cined.com/ | Cameras, lenses, lights; measured tests and stated specs |
| **Newsshooter** | https://www.newsshooter.com/ | Cameras, lenses, support gear; often first with accurate specs |
| **DPReview** | https://www.dpreview.com/ | Cameras and lenses; detailed spec tables (archive still useful) |
| **EOSHD** | https://www.eoshd.com/ | Cameras, codecs, sensor and recording specs |
| **CineD Database** | https://www.cined.com/database/ | Searchable camera/lens database with key specs |
| **B&H Explora** | https://www.bhphotovideo.com/explora/ | Articles and buying guides with spec summaries |

---

## 4. Databases and reference

| Resource | URL | Use for |
|----------|-----|--------|
| **Wikipedia** (specific product) | e.g. “Sony FX3 Wikipedia” | Overview and often cited specs; verify against manufacturer |
| **IMDb Technical Specifications** | imdb.com (search film + “technical specs”) | Lens/camera used on productions (not product specs) |
| **Manufacturer PDF manuals** | From brand support/downloads | Most authoritative for dimensions, power, I/O, compatibility |
| **CineD Database** | cined.com/database | Quick lookup for camera/lens key specs |

---

## 5. Prompt snippet for AI

Copy this into your prompt so the AI “searches” or “consults” these sources:

```
When filling or verifying equipment specs, prefer (in order):
1. Official manufacturer product or support pages (sony.com, canon.com, blackmagicdesign.com, arri.com, red.com, dji.com, sigma-global.com, aputure.com, nanlux.com, godox.com, smallhd.com, atomos.com, teradek.com, rode.com, sennheiser.com, tilta.com, etc.).
2. Trusted retailers with spec tabs: B&H (bhphotovideo.com), Adorama (adorama.com), CVP (cvp.com).
3. Editorial/review sites: CineD (cined.com), Newsshooter (newsshooter.com), DPReview (dpreview.com), EOSHD (eoshd.com).
4. CineD Database (cined.com/database) for cameras and lenses.

Use manufacturer or B&H/CVP spec sections for: dimensions (mm/cm), weight (kg), resolution and frame rates, codecs, power (V/W/Wh), inputs/outputs (HDMI/SDI version, XLR, etc.). For lights: output (lux/lumens), CCT, CRI/TLCI, power draw. For lenses: focal length, T-stop/f-stop, mount, image circle, weight. Never invent specs; if unsure, mark [verify] and state the source you would check.
```

---

## 6. Quick reference by category

| Category | Best primary sources |
|----------|----------------------|
| **Cameras** | Brand site (Sony, Canon, Blackmagic, ARRI, RED, Panasonic) → B&H/CVP specs → CineD / Newsshooter |
| **Lenses** | Brand site (Sony, Canon, Sigma, Zeiss, Angenieux) → B&H → CineD database |
| **Lighting** | Aputure, Nanlux, Godox, Profoto, Broncolor site → B&H |
| **Monitors / recorders** | SmallHD, Atomos, Blackmagic site → B&H |
| **Wireless video** | Teradek, SmallHD, DJI site → B&H / CVP |
| **Audio** | Rode, Sennheiser, Zoom site → B&H |
| **Gimbals / support** | DJI, Tilta, Manfrotto site → B&H |

Use this list in system prompts or in the same doc as your spec example so the AI knows where to “search” for specs.
