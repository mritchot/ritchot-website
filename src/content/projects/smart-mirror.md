---
title: "Smart Mirror"
period: "2026"
stack:
  - Kotlin
  - Jetpack Compose
  - Android 11
  - iCal
  - Open-Meteo API
links:
  repo: "https://github.com/mritchot/vercon-smart-mirror"
weight: 3
summary: "A Kotlin launcher that turned the dead intercom mirror in my rented apartment into a clock, weather, and calendar display that still takes the lobby's calls."
---
The intercom mirror came with the apartment and spent my first year as a tenant unplugged. The building had none of the smart-home features its software expected, and the interface it did have was slow and ugly. I wanted the glass to show my day instead: the time, the weather, and my work and personal calendars, with the lobby intercom actually functional.

Android 11 made it buildable without touching the hardware. Wireless debugging runs over the apartment Wi-Fi, two shell commands swap the launcher, and two more put it back if I move out. The launcher is a Kotlin and Jetpack Compose app that owns the whole screen: a left column with the clock, date, weather, and events, and a right half kept clear. After 19:15 everything turns deep red.

The small features are the ones I use most. Presence checks for my phone on the Wi-Fi and folds the calendar away when I am out. A long hold hides it on demand for guests. A triple tap turns on the light behind the glass. A watcher brings the mirror back after a call. Every setting lives on a config panel on the glass itself.

Claude wrote most of the code under my direction; I set the behavior and tested every build on the glass.

Read how it came together in [fun things with my smart mirror](/writing/fun-things-with-my-smart-mirror/), or the code at [GitHub](https://github.com/mritchot/vercon-smart-mirror).
