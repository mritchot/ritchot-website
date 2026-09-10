---
title: "fun things with my smart mirror"
date: 2026-09-10
type: essay
summary: "The intercom mirror in my rented apartment sat unplugged for a year. Fable and I turned it into the display I wanted."
---
When I moved into my new apartment, one of the things I was curious about was the [Vercon Smart Intercom Mirror](https://verconsmartmirror.com/product/smart-intercom-mirror/). It touted a full smart home environment, ties to the intercom, etc. I generally never bought into smart home systems (there is a [joke](https://x.com/PPathole/status/1116670170980859905) here somewhere about a software engineer and keeping an axe for his toaster) but I decided hey, I'm renting the place, this could be cool to try out.

...only to find out that the apartment didn't have any smart features to actually take advantage of any of the software on the mirror. Disappointing, though I was safe from a [toaster uprising](https://en.wikipedia.org/wiki/Cylon_%28Battlestar_Galactica%29) and saved money on having to buy an axe. It also had an incredibly ugly, clunky, and awful to use, user interface! I hated it! Unplugged you go! To the [island of misfit toys](https://en.wikipedia.org/wiki/Rudolph_the_Red-Nosed_Reindeer_%28TV_special%29)!

I kept the smart mirror off permanently for my first year as a tenant, but I hate having something just sitting there—useless. I started to think of ways I could make this smart mirror useful. I have seen several personal projects of people creating their own smart mirrors over the years (usually going all the way to the hardware side) and decided to give it a run. LLMs have compressed timelines on tasks that would have taken me a lot longer than they were worth in the past, and I had a weekend where I felt like being a hermit. Why not throw Fable at it?

My needs are relatively simple. I wanted to have my work and personal calendars on the mirror so I could have an overview of my day, the ability to look at the next two weeks, and to make the Smart Mirror actually function as an intercom system for calling people up so I didn't have to have my phone so attached to me all day. I had a general design system in mind (growing up with a heavy influence from Japanese internet culture and cyberpunk played a role in what I envisioned), so decided to just throw it all together from prototype to end product, iterating along the way.

The experience made me realize that not only is Fable a great coder, it was fantastic at understanding my design intent and making implementation suggestions along the way!

The first thing I did was pull the mirror off the wall. I assumed I would need a cable into the thing to load my own software, so I flipped it around to reach the back and found a USB port, an Ethernet jack, and a power lead. Then I remembered that Android has had [wireless debugging](https://developer.android.com/tools/adb#wireless-android11-command-line) since version 11, and the default OS was clearly based off of that. Seven taps on the build number, a six-digit pairing code, and my laptop was talking to the mirror over the apartment Wi-Fi.

![The back of the mirror, still hanging from its safety cable: a recessed panel with a USB port, an Ethernet jack, and the power lead, and two speaker grilles in the black casing](/images/writing/smart-mirror-back.jpg)
*The back of the mirror, hanging from its cable. USB, Ethernet, and power.*

The fact that it was based on Android also made my life easier, as this ecosystem is relatively easy to customize based on ages old experience. Re-mounting the mirror on the wall, Fable and I began to investigate what some best implementations could be.

An hour of read-only poking told us what we had: Android 11 on a Rockchip board, a 1920 by 1080 panel behind two-way glass, and no root. Two shell commands could swap the stock launcher out, and two more could put it back if I moved out. Nothing needed flashing. Everything had to be reversible, because I rent the place.

Fable's first plan was pretty dull. Its suggestion was serve a web page into a kiosk browser and call it a launcher. I told it that was lame. I wanted a native app that owned the whole screen. Fable replanned in about a minute and never argued for the browser again. A good assistant will build the safe thing unless you tell it what you want, which is where even having a touch of experience can really lead an LLM to a better product.

Three rounds of mock-ups later we had a left column, which leaves the right half of the glass empty for the intercom app when a call comes in. The type is [IBM Plex Mono](https://github.com/IBM/plex) with [M PLUS 1 Code](https://github.com/coz-m/MPLUS_FONTS) for the Japanese, ported from my [startpage](https://github.com/mritchot/jp-startpage). After 19:15 everything turns a deep red so the glass avoids being an eye-sore late at night. The greeting runs down the side in Japanese because I simply liked how it looked.

![Round-one mock-up: a pixel-font clock in the top-left corner, the weather in the top-right, today's and tomorrow's events in the bottom-left, and a horizontal Japanese greeting in the bottom-right](/images/writing/smart-mirror-mockup-round1-main.png)
*Round one: pixel type, one element in each corner.*

![Round-two mock-up: the same four-corner layout in a clean monospaced type, with the Japanese greeting now running vertically down the right edge](/images/writing/smart-mirror-mockup-round2-main.png)
*Round two: the corners kept, the pixel type gone, the greeting turned on its side.*

![Mock-up of the mirror's main screen: a large clock, the date, the weather, and today's and tomorrow's events in a left column, with a vertical Japanese greeting beside them](/images/writing/smart-mirror-mockup-main.png)
*Round three: everything into a left column, the right half kept clear for calls.*

![The same mock-up in the night palette, every element in a deep red on black](/images/writing/smart-mirror-mockup-night.png)
*The night palette from the same round.*

It also suggested things I never thought of!

Presence was the best of them. The mirror pings my iPhone over Wi-Fi once a minute, and once the phone has been silent for twenty-five minutes the calendar folds away. The glass shows only the clock, the weather, and 留守 · USER AWAY. Return, and it is back within a minute or two. A privacy feature I really may never use, but nice nonetheless.

The guest lock and its unlock were my ideas, and Fable orchestrated a way to make it work. A long press hides the calendar on demand, and the only way out is a tap pattern. I'm not going to write it here, as this guest lock was made all because my friends can not help but just tap everywhere on this screen when they come over, leaving their grubby little fingerprints all over the place. My secret life and calendar are hidden from my curious guests!

Two more came from Fable unprompted. When a day has more events than the column can hold, the overflow line reads +3 MORE, and a tap on it opens that day. After the first food delivery left the intercom app's call screen stranded over the mirror for an afternoon, Fable proposed a watcher. It wakes the display when the lobby rings, and once no ring or call has been heard for a minute it brings the mirror back. I would have lived with the stuck screen for a week before thinking of that.

The build ran in phases over a weekend. Saturday morning was reconnaissance and the launcher swap; by the afternoon the glass showed the clock, the date, and the weather from [Open-Meteo](https://open-meteo.com/). Sunday brought the calendars. A rule hides the work calendar from Friday afternoon until Sunday evening. Presence and the fourteen-day view came after.

The little touches and features at the end were the fun part, each one a small piece that made the thing mine. They added seconds to the clock, a swipe through the cities I care about, a holiday mode, and a dim step at thirty minutes with a screen off at sixty. The strip of light behind the glass took longer. Fable decompiled the stock launcher to find it, traced it to two PWM channels, and now a triple tap on the right side of the glass turns it on. Volume and the microphone got their own rows on the config panel once we confirmed the mirror had both.

The first night the mirror slept properly, but the app restarted itself every fifteen minutes until morning. Android's Doze had cut its network, every calendar fetch failed, and a safeguard we had written for a different problem kept relaunching it. Fable read the 6 a.m. logs, explained it, and fixed it in one pass. Light work, and work that I really had no time for!

![The finished main screen by day: clock with seconds, date, weather, and thirteen calendar rows in near-white type on black](/images/writing/smart-mirror-screen-main-day.png)
*The main screen on a busy day.*

![The finished main screen at night, the same layout in deep red](/images/writing/smart-mirror-screen-main-night.png)
*After 19:15.*

![The fourteen-day view: seven days in two columns with a selector for all, personal, or work events](/images/writing/smart-mirror-screen-fourteen-days.png)
*The next fourteen days, seven per page.*

![The config panel: steppers for the work-calendar window, holiday, night red, lamp, presence, display, and sound](/images/writing/smart-mirror-screen-config.png)
*Every setting.*

![The idle screen: clock and weather only, with the note 留守 · USER AWAY at the bottom](/images/writing/smart-mirror-screen-idle-away.png)
*What a guest sees when my phone is not home.*

![The mirror on a wood-paneled hallway wall in daylight, its frame lit, showing only the time, date, and weather over the reflection of the room](/images/writing/smart-mirror-daylight.jpg)
*On the wall, in daylight, in the idle state a guest sees.*

![The mirror at night on the same wall: the frame's light ring on, the clock, date, and weather in dim red over the reflection of the hallway](/images/writing/smart-mirror-night.jpg)
*The same wall after 19:15.*

Benedict Evans wrote last week about [AI, tools and transformation](https://www.ben-evans.com/benedictevans/2026/9/3/ai-tools-and-transformation), and this project is really the epitome of his argument. Tools are cheaper to build than they have ever been. But most people are not tool builders, and most people do not instinctively look for a different way to do *anything*. The hard part is "knowing that you need a tool for this in the first place", and then knowing what it should do. I knew both. I had lived with the dead glass for a year and had the design in my head. I also had enough Android in my history to judge what Fable handed back. Take any of the three away and the mirror is still unplugged.

The models are extraordinary at the part I am worst at, the volume, and no help at all with the part I care about, the wanting. Evans's open question is whether the transformation comes from handing everyone a model or from the new things a few people build with one. I do not know. For me the change is smaller and better: I can now take on a project like this whenever the fancy hits me, and finish it before the fancy leaves.
