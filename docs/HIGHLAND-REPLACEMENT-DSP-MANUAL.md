# Highland replacement harness and HELIX V TWELVE DSP MK2 commissioning manual

**Revision: 2026-10-08. Status: UNCOMMISSIONED.**  
[Interactive wiring inspector](dsp-wiring.html) | [Photographic evidence JSON](data/replacement-harness-2026-10-08.json) | [Engineering workspace](engineering.html)

> STOP BEFORE POWER-UP. The nine owner-supplied photos confirm seven IN/OUT sleeve labels, wire colours and two white connector housings, not the actual plug cavities or polarity continuity. Nothing in this manual replaces checking the disconnected wire harness with a meter.

## 1. Why the replacement matters

| | Previous faulty cable | Replacement family |
| --- | --- | --- |
| MATCH product | PP-TES 1.7B **Ryzen**, order **M141318** | PP-TES 1.7B **Highland**, order **M141320** |
| Official Tesla compatibility | Model 3 03/2022–09/2023; **not Highland** | Highland Model 3 from 10/2023 |
| Purpose originally designed for | MATCH UP 10DSP | MATCH UP 10DSP |
| HELIX V TWELVE compatibility | Required custom amplifier-side leads | Still requires careful amplifier-side termination and power supply |
| Actual received label/order number | M141318 previously identified | **M141320 expected, but not readable in supplied photos** |
| Old colours installed on HELIX | Actual positions not photographed | New lead sleeves + conductor colours are photographed |
| Tesla white connector cavity map | Not proven, suspect incorrect routing for Highland | Not yet continuity-verified |

Official [Ryzen product](https://www.audiotec-fischer.de/en/match/adaptors-harnesses/pp-tes-1-7b-ryzen) and [Highland product](https://www.audiotec-fischer.de/en/match/adaptors-harnesses/pp-tes-1-7b-highland).

Previous installation symptoms included the **right dashboard speaker audible while the DSP was off** and a tweeter that still sounded with all A–G DSP speaker-output leads disconnected. These point toward a remaining OEM bypass / incorrect returns but do **not** establish which cavity is wrong. The old Tesla-side plugs were not modified; the old amplifier-side MOLEX connectors were removed. Investigate any continued sound with DSP outputs disconnected separately from software tuning.

## 2. Replacement wire colours and DSP side

Every new sleeve is printed **IN +, IN -, OUT +, OUT -**. The colours below are new harness wire colours. Tesla OEM connector segment colours are different.

| HELIX channel | Old planned Ryzen label/colour family (not observed terminal) | New label | New plus | New minus | Tesla source |
| --- | --- | --- | --- | --- | --- |
| A | Front Low Left / orange | **Front Low/TW Left** | Orange | Orange/black | X171 6 YE+ / 5 BU− |
| B | Front Low Right / brown | **Front Low/TW Right** | Brown | Brown/black | X171 2 YE/WH+ / 1 BU/WH− |
| C | Front Left / white | Front Left | White | White/black | X175 10 YE+ / 9 VT− |
| D | Center / blue | Center | Blue | Blue/black | X171 7 GY+ / 8 BU− |
| E | Front Right / grey | Front Right | Grey | Grey/black | X175 4 TN+ / 3 BK− |
| F | Rear Left / green | Rear Left | Green | Green/black | X175 13 RD+ / 14 BK− |
| G | Rear Right / purple | Rear Right | Purple | Purple/black | X171 3 RD/WH+ / 4 BK− |

**Important distinction:** matching orange/brown/white/blue/grey/green/purple families does not establish that the old and new Tesla connectors are pinned identically. The physically relevant differences in the white mating plugs remain to be traced. New photos are IMG_4126.jpeg through IMG_4134.jpeg. They were not silently copied into the public repository.

HELIX **HIGHLEVEL INPUT** terminals are printed **-A +A, -B +B ... -L +L**, grouped A–F and G–L. HELIX amplified **OUTPUT CHANNELS** terminals are printed **+A -A, +B -B ... +L -L** (A–F and G–L blocks). Connect every new sleeve marked IN only to HIGHLEVEL INPUT and every sleeve marked OUT only to its speaker OUTPUT. Differential minus leads are not chassis grounds. Read markings on the actual amplifier; never infer a left/right plug orientation from camera angles.

Known downstream Tesla returns are A→X568 front-left door woofer, B→X578 right woofer, C→X566 left dashboard midrange, D→X595 center dashboard, E→X576 right dashboard, F→X586 rear-left door and G→X591 rear-right door. These OEM references do **not** prove new harness plug cavity positions.

The previous technical model derived tweeters H/I directly from the **dashboard** inputs C/E. That is not a suitable automatic assumption when the replacement cable now labels A/B **Low/TW**. Electrical topology and OEM signal frequency response must be checked before reusing any old DSP routing.

## 3. Shared front woofer/tweeter: hardware gate

The installed **HELIX Ci7 W200FM-S3** door woofer is **3 Ω** and the **Ci7 T20FM-SC** tweeter is **4 Ω**. Directly wiring them in parallel to one amplifier output yields a nominal load below the V TWELVE **2 Ω minimum**, and an unfiltered tweeter can be damaged. Do **not** use a parallel splice as a passive crossover.

There are only two valid *conditional* choices:

1. **Preferred independently active wiring:** physically isolate and run the two door woofers on **A/B** and the two tweeters on **H/I**, with their own independent speaker leads. Unpowered meter test must prove no A↔H or B↔I common speaker connections. H/I stay muted until protective highpass is programmed and verified.
2. **Passive shared wiring:** A/B may each serve a woofer+tweeter pair only with a deliberately designed, correctly connected **passive crossover** and a safe combined impedance/load. **H/I remain unconnected and muted.** DSP A/B cannot have separate tweeter and woofer frequency filters, EQ or delay in this mode.

The printed Low/TW label alone proves neither topology. Also keep the separate Tesla X175 7/8 AMP3_4 path (previously identified as another front high-frequency path) distinct pending circuit tracing. A past tweeter playing despite all DSP A–G returns disconnected means it could have an independent OEM feed. Verify before connecting an added amplified H/I lead.

## 4. DSP PC-Tool: correct input and VCP matrix

Save/export a backup of every existing DSP setting before touching routing. In **DCM**, enable **Virtual Channel Processing (VCP)** and measure highlevel source sensitivity rather than assuming the factory default **11.3 V** suits this specific OEM source. Input A–G must be verified and measured with the HELIX **Input Signal Analyzer (ISA)** before choosing any mixing ratios.

| Main to Virtual Routing | Input(s) | Condition |
| --- | --- | --- |
| Front L Full | HIGHLEVEL A and C | Measure A, C and A+C; phase/delay/level align before summing complementary bands |
| Front R Full | HIGHLEVEL B and E | Measure B, E and B+E; same rule |
| Front Center Full | HIGHLEVEL D | Preserve actual center source; do not invent L/R downmix |
| Rear L Full | HIGHLEVEL F | Independent rear source |
| Rear R Full | HIGHLEVEL G | Independent rear source |
| Subwoofer 1 (virtual K) | Measured, safe mono bass from front full/LF signals | Confirm sum headroom and phase |
| Subwoofer 2 (virtual L) | Same measured mono bass | Use separate sub-output level control only after measured |

Do not assume the two front sources on each side should be mixed 100% at equal level. If A or C is already full range, use that alone rather than summing redundant bands. Input EQ cannot invent missing content. Use ISA Input EQ to correct OEM processing conservatively, with all other EQs flat to start.

**Virtual to Output Routing**

| Virtual signal | Physical amplified outputs |
| --- | --- |
| Front L Full | A = door woofer, C = dash mid, H = tweeter **only when isolated** |
| Front R Full | B = door woofer, E = dash mid, I = tweeter **only when isolated** |
| Front Center Full | D = center dash coax |
| Rear L Full | F = OEM rear left |
| Rear R Full | G = OEM rear right |
| **Subwoofer 1 virtual K** | **Physical J** = Pioneer donor woofer 1 |
| **Subwoofer 2 virtual L** | **Physical K** = Pioneer donor woofer 2 |
| None | Physical L and RCA line M/N unused |

**DIRECTOR SubRC warning:** the manufacturer's V TWELVE manual states that without VCP remote sub volume is assigned to **physical K and L**. In the planned build subs use **physical J and K**. Enabling VCP and routing **virtual Subwoofer 1 (K)** and **virtual Subwoofer 2 (L)** into physical J/K is required for the remote volume control to affect both. Test both before completing installation. Virtual K/L are NOT the physical output numbers.

## 5. Starter crossover frequencies, equalizer and levels

All values below are **provisional commissioning starting values**, never a measured completed AFPX DSP file. **HP** = high-pass, **LP** = low-pass, **LR24** = Linkwitz-Riley 24 dB/oct. Keep outputs muted during configuration.

| Amplified output | Speaker in fully active configuration | HP | LP | Safe initial gain |
| --- | --- | --- | --- | --- |
| A/B | Ci7 W200FM-S3 woofers | 55–65 Hz LR24 | 250 Hz LR24 | −12 dB |
| C/E | Ci7 M100FM-S3 100 mm dash midranges | 250 Hz LR24 | 3.5 kHz LR24 | −12 dB |
| D | Ci3 C100.2FM-S3 MK2 center coax | 180 Hz LR24 | OFF if built-in coax filter confirmed | −12 dB |
| F/G | OEM rear-door speakers | 100 Hz LR24 provisional | OFF | −12 dB |
| H/I | Ci7 T20FM-SC tweeters on **separate isolated wires** | **3.5 kHz LR24, never bypass**, manufacturer's 24 dB/oct minimum >2.5 kHz | OFF | −18 dB and MUTED until verified |
| J/K | Independent Pioneer TS-WX1220AH donor 12-inch woofers | 25–30 Hz LR24, **enclosure dependent** | 75–80 Hz LR24 | −12 dB and MUTED until DCR/load known |
| L | Spare | — | — | MUTED |

If speakers share A/B through verified *passive* crossovers, the full-active **250 Hz A/B low-pass must not be used** because it would remove the treble for the passive tweeter. Passive crossover design and load set the allowed A/B broad passband.

Initial tuning sequence: **Input EQ flat → ISA measurement and amplitude/phase correction → Virtual EQ flat → Output EQ flat → protective filters and output gain → polarity verification → time alignment → cabin RTA/mic measurement → limited corrective EQ**. Do not add bass or treble boosts before measuring crossover summation and clipping. Turn optional Sound FX/RealCenter/Augmented Bass off for first routing and baseline measurements. Set output delays from microphone measurements, not imagined driver distances.

The Pioneer driver's published 2 Ω nominal product-family figure is still a working basis, not proof of each loose donor-driver's DCR. Keep separate J and K speaker leads (no bridging/series/parallel connection), and verify their continuity. The original older subwoofer 5 m lead may be retained but should be traced before reuse; absence or presence of a new optional lead is not established in the photos.

## 6. Acceptance steps

1. **Vehicle electrically safe:** isolate low-voltage supply using the correct Tesla procedure; verify absence of voltage. Record exact replacement manufacturer label (**M141320 expected**) and mating cavity numbering/orientation. Do not repin the received Highland cable based on the faulty Ryzen map.
2. **Unpowered electrical QC:** trace all **A–G IN +/-** and **A–G OUT +/-**, corresponding Tesla X171/X175 nets, downstream return, and absence of shorts/crossfeed. Investigate the prior right dash/tweeter bypass. Verify rear OEM returns and front tweeter branch isolation.
3. **Speaker load QC:** confirm the 3 Ω woofer and 4 Ω tweeter are not directly paralleled; verify crossover or independent active connections. Measure each Pioneer donor woofer and its isolated J/K leads. Leave anything unverified unplugged.
4. **DSP software QC:** back up previous AFPX; save the new VCP setup to a separate user memory slot with proper virtual naming, safe output HP/LP and all outputs muted. Measure source channels A–G using ISA. Select input reconstruction rather than assuming two feeds sum.
5. **Low-volume functional QC:** power only verified channels one at a time; listen for wrong location/phase, clipped sound, protection mode, speaker heating or bypass audio when DSP outputs are disconnected. H/I last, after verifying high-pass; J/K after load checks. Verify both physical J/K follow DIRECTOR SubRC.
6. **Tuning sign-off:** save the actual final AFPX preset, DSP screenshots, ISA/RTA curves, speaker DCR readings and replacement connector cavity matrix. Until then status remains **NOT COMMISSIONED**.

## 7. Official references and legacy documentation boundary

- [MATCH Highland M141320 product](https://www.audiotec-fischer.de/en/match/adaptors-harnesses/pp-tes-1-7b-highland)
- [MATCH Ryzen M141318 product](https://www.audiotec-fischer.de/en/match/adaptors-harnesses/pp-tes-1-7b-ryzen)
- [V TWELVE DSP MK2 amplifier manual, VCP/SubRC](https://www.audiotec-fischer.de/media/pdf/d3/17/06/HELIX-V-TWELVE-DSP_MK2_148x210mm_02-12-21_web.pdf)
- [HELIX VCP](https://www.audiotec-fischer.de/en/knowledge-base/DSP-PC-Tool/vcp/) and [IO routing](https://www.audiotec-fischer.de/en/knowledge-base/DSP-PC-Tool/io/)
- [HELIX ISA/Input EQ](https://www.audiotec-fischer.de/en/knowledge-base/DSP-PC-Tool/isa/) and [DCM/input gain](https://www.audiotec-fischer.de/en/knowledge-base/dsp-pc-tool/dcm/)
- [HELIX Ci7 T20FM-SC manufacturer highpass limits](https://www.audiotec-fischer.de/en/helix/speakers/compose/i7/ci7-t20fm-sc)
- [HELIX Ci7 W200FM-S3 3 Ω manufacturer data](https://www.audiotec-fischer.de/en/helix/speakers/compose/i7/ci7-w200fm-s3)

The legacy 2026-09-16 Ryzen “repin the donor” guide is **superseded**. Tesla OEM electrical metadata and Parts Catalog speaker identifiers remain valid independent references. The nine user-uploaded photos are identifiable evidence, but are not bundled into this public GitHub repo, and the new harness pinout is **not declared verified**.
