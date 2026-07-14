---
title: "reflections, and the state of LLMs at the end of 2025"
date: 2026-01-09
type: essay
summary: "A year-end look at LLMs becoming ordinary software: world models, the autonomy slider, the local-compute wall, and why 2026 is for building instead of benchmarking."
---
**Key Points**
* The public perception of Large Language Models (LLMs) is shifting from "superintelligence" to standard software infrastructure. While the novelty is fading, widespread adoption remains relatively low, and the industry now has to demonstrate utility beyond the initial hype cycle.
* The dominant paradigm is evolving from text-based prediction ("Attention is All You Need") toward systems capable of agency, planning, and maintaining state ("Video Games Are All You Need"). Recent advancements, such as Claude Opus 4.5 navigating Pokémon, demonstrate progress in visual planning, though models still lack a conceptual understanding of the world.
* We are entering an era of "Software 3.0," where natural language prompts replace code. Effective professional workflows now require mastering the "Autonomy Slider" (strategically determining when to delegate tasks to AI and when to retain manual control) while maintaining a rigorous human verification layer.
* My desire for localized, private AI ("personal Software 3.0") is currently stifled by prohibitive hardware costs, particularly high-bandwidth memory. This forces a return to a "time-sharing" model where users rent intelligence from centralized servers rather than owning the compute. This is also causing a lot of resentment against AI labs.
* Public benchmarks have become increasingly irrelevant for assessing real-world performance. The focus for 2026 shifts from testing generic capabilities to building practical applications and arguing that institutions need to develop internal, context-specific validation metrics.

It has been just over a year since I started writing publicly again. When I launched this site, my goal was to move from private scribbles to shared knowledge, and I find I am still finding my voice. As the main topic that has become the seeming focus of my writing is AI, finding my voice has been a bit difficult. The world of Large Language Models (LLMs), and the broader umbrella of AI, moves with such velocity that by the time I formalize a thought, the frontier has often shifted. I may not publish often, but even I still feel that I have to force pieces out before the landscape shifts and the piece of writing I am working on becomes irrelevant. It’s hard to see how the average person keeps up with changes in this space.

But as we settle into 2026, I want to take a moment to look at the "state of" LLMs. More because I want to change my limited time focus away from just writing about AI to building, which I hope this piece can act as some sort of volta.

We are entering a strange period where the magic and excitement is wearing off for the public, and the real work is beginning. As Benedict Evans spoke about in [*AI Eats the World*](https://www.youtube.com/watch?v=niJpDnNtNp4), 15 years ago, searching your photo library for "dog" would have been witchcraft. Ten years ago, it was "AI." Today, it is just software. We are rapidly approaching the point where the public no longer views LLMs as "superintelligence" (daily active users of generative AI still hover somewhere around 10%, with weekly active users approximately 30-35%; people know the tools exist but generally don’t know what their use case is, which is low for a tool that is supposed to completely change the world). Enterprise is still figuring out where the actual value lies, but overall, these tools will likely just be viewed as software, despite Sam Altman wanting you to believe otherwise so he can get out of his contract with Microsoft.

For the last few years, the dominant paradigm was defined by [*Attention is All You Need*](https://arxiv.org/abs/1706.03762). It gave us the text-based oracles we have grown used to. They have grown in capabilities considerably; however, to the average user, it is likely perceived that these tools are hitting a ceiling, aside from the gamed benchmarks published on model releases that are growing increasingly useless for assessing work on your actual tasks. I use these oracles extensively. They are magical, yes. But they don't understand the world the way a cat, a dog, or a small child does. They have limitations.

The new frontier, I think, can jokingly be best summarized by a different phrase: Video Games Are All You Need.

In my very first article on this site, [*AI: Knowing The Gods We Have Created*](https://ritchot.me/ai-knowing-the-gods-we-have-created/), I wrote about how my interest in AI was sparked by fiction and gaming, from the philosophical questions of Deus Ex to the strategic dominance of AlphaGo. I find it amusing that this was my first piece because, to me and [several researchers I find persuasive](https://www.youtube.com/watch?v=aR20FWCCjAs), it seems increasingly apparent that LLMs themselves are not going to become AGI, though they are likely an important step on the way there. To bridge the gap to AGI, AI needs to build an internal model of how the world works, simulate outcomes, and act in real-time.

Capabilities here are getting better amongst general consumer-facing models, and one amusing example of this is in [ClaudePlaysPokemon](https://www.twitch.tv/claudeplayspokemon). For a long time, models from Anthropic struggled with Pokémon Red. They could generate code, but they couldn't navigate a simple 2D game because they lacked "object permanence" and visual planning. But in December, Claude Opus 4.5 finally broke through, navigating the Team Rocket Hideout and recognizing gym leaders that previous models (like Sonnet 3.7) essentially hallucinated or walked past. I simply do not have the time to watch the stream for hours, but [Julian Bradshaw wrote a piece just before the Christmas break that I recommend anyone to read if you have any interest in AI](https://www.lesswrong.com/posts/u6Lacc7wx4yYkBQ3r/insights-into-claude-opus-4-5-from-pokemon). It goes over the improvements that have occurred and the limitations with the new model release on this task. It’s also pretty entertaining if you have any familiarity with playing Pokémon as a kid.

Being so interested in an LLM playing a Game Boy game that I beat at 9 years old may seem silly, but it is a meaningful step toward agency. The big buzzword that everyone latched onto for 2025 in the field of education was “AI Agents,” which I felt the narrative in this industry was highly over-enthusiastic about considering the work that needs to be done for them to do meaningful work in my field. However, tools like Deep Research and Coding Agents are good enough to be useful if they fit your use case. These “off-the-shelf” models are getting better at maintaining a state of the world, planning a route, and executing it over time.

However, we must be careful not to anthropomorphize these systems too quickly. Just because they can play Pokémon doesn't mean they see the world like we do. There is a lot of interesting work being done here. New research from DeepMind on [teaching AI to see the world more like we do](https://deepmind.google/blog/teaching-ai-to-see-the-world-more-like-we-do/) gets at this divergence between human and machine cognition. When humans look at a plane and a car, we group them as "vehicles" despite them looking very different. AI, however, often groups things based on visual texture or shape rather than functional concept. It sees the pixels, but it misses the essence.

There has been real progress in how AI tools view the world. In my piece just over a year ago, [*o1 still sucks at math*](https://ritchot.me/o1-pro-mode-still-has-a-long-way-to-go-for-mathematics/), I told my students they still had to do the heavy lifting due to the weakness in the vision models that LLMs use. That has shifted considerably, and in my [follow-up piece,](https://ritchot.me/gpt-5-has-come-a-long-way-in-mathematics/) my main point was that I no longer have any doubts about these models doing real-world tasks going forward[^1]. As AI sees the world through "alien" eyes, the role of the student (and the teacher) shifts to providing context, alignment, and verification.

The teacher's job is now going to get the addition of showing students how to become the verification layer for their digital coworkers. Progress is likely to be slow here, as (broadly speaking) I see very little expedience by most institutions in tackling this challenge yet. This will need a lot of internal training, and I see a lot of resistance since it will result in a complete restructuring of assessments in many schools. If you want to see an example of just how much work, the [University of Sydney has published a fair bit on their two-lane approach to assessment](https://educational-innovation.sydney.edu.au/teaching@sydney/program-level-assessment-two-lane/).

While researchers are solving the "world model" problem, most of the value attention is in a shift in how we build and how software will work. [Andrej Karpathy describes this as the move to Software 3.0](https://www.youtube.com/watch?v=LCEmiRjPEtQ).

* Software 1.0: C++ and Python (Explicit instructions).
* Software 2.0: Neural Networks (Tuning weights).
* Software 3.0: English (Prompts as programs).

Software 3.0 is, in effect, a democratization of creativity. We are seeing ["vibe coding,"](https://x.com/karpathy/status/1886192184808149383?lang=en) where people with no formal training build apps just by describing what they want. But these "people spirits" we have summoned have "anterograde amnesia": they wake up every morning with a wiped memory. They are brilliant but forgetful coworkers.

Andrej Karpathy's framing for how this plays out in practice is useful: The Autonomy Slider.

We often talk about AI in binary terms: replacement or nothing. But in tools like [Cursor](https://cursor.com/), the reality is a slider. You choose how much control to give up. You can have the AI autocomplete a line, or you can give it a goal and let it run for an hour.

In education and all professional work, we need to master this slider and determine the exact professional loop that will inevitably affect the tasks in our daily work. It's generally in our best interest to master this slider so that we can make the loop of AI and human collaboration as quick as possible so that my time can be spent on more cognitively demanding tasks and human collaboration.

The danger still exists when we crank the slider to "max" without the expertise to verify the output. You still need a human hand on the wheel.

One personal frustration entering 2026 is increasing personal computing costs. My hope was that this commoditization of models would lead to a revolution in local AI: powerful models running on my own hardware, free from corporate meddling. I want to run my own "Software 3.0" at a local level. I want to build and experiment with agents that live on my hardware, not in a data center in Virginia.

Unfortunately, that dream is hitting a very real economic wall: RAM prices (well, hardware prices in general).

The industry's voracious appetite for high-bandwidth memory has crowded out consumer supply. The increase in personal computing hardware prices has effectively moved us back to a 1960s era of “time-sharing” compute. We don't own the computer; we rent time instead. When the servers go down, we experience what Karpathy calls an "intelligence brownout." The grid flickers, and suddenly, the planet gets dumber.

**So what am I actually doing in 2026?**

I am done writing about personal benchmark testing. I had some experiments in mind that would have leveraged [OpenRouter](https://openrouter.ai/), but the space moves so fast that my results would likely be obsolete upon release. It’s a bit too much for one person with zero budget. Institutions will need to start investing in time, personnel, and resources to create their own internal benchmarks for their use cases. I have written about this before and have done small-scale work with this already, so feel free to hire me.

I am done caring about the benchmark results that are released with every model. They are directionally interesting but practically useless. I’m fairly confident in the ability of consumer-facing generative AI tools to do or assist with the more blasé aspects of my job. Whether a model scores 98% or 99% on a math test is irrelevant if it can't navigate the messy reality of a 3D world, or a messy classroom. Start giving me useful products.

My goal for 2026/2027 is to build. Not sure how that will look exactly, but I’m sure I’ll figure it out.

The "Gods we created" are here. They can navigate a Game Boy game I beat at nine, but they still confuse a car with a plane because both have smooth surfaces. But they are the most capable coworkers I have ever had, and I would rather spend the next year building with them than writing about them.

*If you want to chat, shoot me an [email](mailto:michael@ritchot.me). If you would like to get updates, subscribe to my blog via [email](/subscribe/) or [RSS feed](/feed/). You can also follow me at [LinkedIn](https://www.linkedin.com/in/mritchot/), and [X](https://x.com/MichaelRitchot).*

[^1]: This may seem like a contradiction, as I write earlier that I think agents have a long way to go before doing meaningful work in my field. That is because my work is made up of many different tasks, and while it may excel at some of them, the field of education has a lot of complexity to it and context that generative AI tools still struggle to handle.

**Other Pieces of Interest**

Here are some other links that people may find interesting, but didn’t find their way into the main body of this piece:

* I’ve always enjoyed hearing John Carmack talk, and he’s one of the few I could listen to on technical subjects for hours. Recently he [spoke at Upper Bound 2025](https://www.youtube.com/watch?v=iz9lUMSQBfY). It’s a good watch if you want to look a little more at how AI needs to be able to create a model of the world and transfer skills between domains.
* Both [Simon Willison](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) and [Andrej Karpathy](https://karpathy.bearblog.dev/year-in-review-2025/) wrote LLM year-in reviews, which I forced myself to not read until after I finished writing my article. Both are worth reading and more technically detailed than what I have covered here.