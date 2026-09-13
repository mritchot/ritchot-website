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
The intercom mirror came with the apartment and spent my first year as a tenant unplugged. The building had none of the smart-home features advertised and the interface it did have was slow and ugly. I wanted the glass to show my day instead: the time, the weather, and my work and personal calendars, with the lobby intercom actually functional.

Built on Android 11, two shell commands to swap the launcher in and out over wireless debugging.

Claude wrote most of the code under my direction; I set the behavior and tested every build on the glass.

Read how it came together in [fun things with my smart mirror](/writing/fun-things-with-my-smart-mirror/), or the code at [GitHub](https://github.com/mritchot/vercon-smart-mirror).
