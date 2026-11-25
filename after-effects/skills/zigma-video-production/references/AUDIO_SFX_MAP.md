# Zigma Commercial Video Audio & Foley Mapping Matrix

Standard 12-track audio design architecture for high-conversion 9:16 mobile commercial product videos.

---

## 1. Master Soundtrack Bed

| Track | Level | Fade / Automation | Role |
| :--- | :--- | :--- | :--- |
| **Commercial Soundtrack** | `-1.5 dB` | Keyframed from `-1.5 dB` at $24.0	ext{s}$ down to `-45.0 dB` at $27.8	ext{s}$ | High-energy corporate / funk / hip-hop groove. Offset start time (e.g. `-0.77s`) to lock musical downbeats to cuts. |

---

## 2. Precision 11-Layer Foley Suite

| Layer Name | Typical Range | Standard Level | Foley Asset Type | Function / Visual Sync |
| :--- | :--- | :--- | :--- | :--- |
| **`SFX_01_Intro_Swoosh`** | `0:00 – 1.85s` | `-3.0 dB` | Air / wind whoosh (`SWOOSH 1.wav`) | Cinematic opening hook as initial product shot emerges |
| **`SFX_02_Cut2_Swoosh`** | `2.80s – 3.78s` | `-3.0 dB` | Fast clean swoosh (`clean-fast-swoosh`) | Dynamic wipe into Scene 2 |
| **`SFX_03_Steam_Hiss_Foley`** | `2.95s – 6.20s` | `-10.0 dB` | Thermal steam ambient loop | Product action Foley with smooth fade-in/fade-out |
| **`SFX_04_Cut3_Swoosh`** | `5.75s – 6.73s` | `-3.0 dB` | Fast clean swoosh | Transition into coil / droplet macro |
| **`SFX_05_Boil_Surge_Impact`**| `8.85s – 10.18s` | `-3.0 dB` | Cinematic impact blow | Heavy punch landing on rapid boil / heat surge |
| **`SFX_06_Cut5_Swoosh`** | `13.80s – 14.78s`| `-3.0 dB` | Fast clean swoosh | Transition into electrical casing / lead cut |
| **`SFX_07_Electric_Power_Foley`**| `13.95s – 16.76s`| `-10.0 dB` | Static electricity / power hum | Tech Foley reinforcing shockproof safety |
| **`SFX_08_Cut6_Swoosh`** | `16.80s – 17.78s`| `-3.0 dB` | Fast clean swoosh | Transition into hero product showcase |
| **`SFX_09_Climax_Bass_Riser`**| `20.50s – 24.20s`| `-16 dB → -4 dB` | Exponential sub riser | Builds anticipation during final statement and CTA |
| **`SFX_10_Outro_Whoosh_Hit`** | `22.00s – 26.00s`| `-3.0 dB` | Cinematic whoosh-to-hit | Synchronized directly with `Zoom & Twirl` precomp |
| **`SFX_11_Sub_Logo_Impact`** | `24.40s – 27.90s`| `-2.0 dB` | Sub-bass impact | Authoritative brand mark landing on white solid end-card |
