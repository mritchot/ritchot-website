---
title: "GPT-5 has come a long way in Mathematics"
date: 2025-11-23
type: analysis
summary: "Re-running last year's CEMC test against GPT-5: 98% per-attempt accuracy ends the era of unreliable AI mathematics, and institutional responses have not kept pace."
---
**Key Points**
* I will no longer be running this specific test as an individual again. I no longer doubt an LLM's ability to solve Mathematics problems.
* GPT-5 achieved 4/4 reliability on 48 of 50 questions (96 percent) and 392 correct answers out of 400 attempts (98 percent).[^1][^2]
* Vision and geometry remain relative weak points, but the failures are now narrow and sporadic; text-backed diagrams, number lines, and most diagram-based CEMC problems are handled well enough that “just use images” is no longer a robust defense for take-home tasks.
* Outside K–12, leading experts like Scott Aaronson and Terence Tao are already using large models as genuine mathematical collaborators, while new evidence suggests generative AI is increasing both the quantity and quality of academic publications, especially for early-career and non-native English scholars.
* Institutional responses have not kept pace: schools and organizations still rely on legacy assessments, vibes, and generic benchmarks (if they are using any at all) instead of systematically “job-interviewing” models on local tasks.

Last December, I wrote an article titled [o1 pro mode still has a long way to go for Mathematics](https://ritchot.me/o1-pro-mode-still-has-a-long-way-to-go-for-mathematics/). At the time, OpenAI’s new “reasoning” models were being heavily marketed as smarter, more careful, and better at logic. In my own tests, the reality in a secondary math context was much less impressive. The model was better than its predecessors, but it still missed enough questions that I could reasonably say my mathematics classroom was largely safe.

With the [release of GPT-5 in August 2025](https://openai.com/index/introducing-gpt-5/), I wanted to revisit those tests with a new set of questions to see how far LLMs have actually come. The improvement has been substantial. Not even a year later, I can no longer assert that these tools “have a long way to go” in the way I meant back then.

Compared to last year’s o1 pro mode run, where the model cleared the “[4/4 reliability](https://openai.com/index/introducing-chatgpt-pro/)” bar on only 40 of 60 questions (67 percent) and answered 177 of 240 individual trials correctly (74 percent), GPT-5 represents a substantial jump in consistency. In this new round of testing, it achieved 4/4 reliability on 48 of 50 questions with the “use code” prompt and 48 of 50 without it, and produced 392 correct answers out of 400 total attempts, for a 98 percent success rate.

Put differently, under essentially the same problem framework [provided by the University of Waterloo’s Centre for Education in Mathematics and Computing (CEMC)](https://cemc.uwaterloo.ca/resources/potw), the system has moved from missing roughly one in four attempts to missing about one in fifty. The single stubborn failure was the same question type regardless of whether I explicitly encouraged it to call on tools such as writing code. As before, it seemed more like an issue with the image model rather than with mathematics ability.

## Last Year’s Test

In [my original article](https://ritchot.me/o1-pro-mode-still-has-a-long-way-to-go-for-mathematics/), I had a relatively simple question: how good, really, are these models at the kind of mathematics my students actually do?

OpenAI’s o1 and o1 pro modes were marketed as “thinking” models that reasoned through problems, especially in mathematics and science. They were multimodal, which meant they could allegedly handle text and images in a more unified way. For an educator previously in the secondary math trenches, this raised obvious questions about assessment, homework, and what it means to do authentic work in a world where any question can be fed into ChatGPT.

To stress test those claims in a classroom-relevant way, I used the [CEMC Problems of the Week from the University of Waterloo](https://cemc.uwaterloo.ca/resources/potw). These are not competition-only questions for Olympiad students, but structured problems that span grades 3 to 12, with a mix of number sense, algebra, geometry, and word problems. I took 12 questions at each of five difficulty levels for a total of 60 questions, converted the PDFs into images, and evaluated o1 pro mode on four trials per question using a simple, consistent prompt.

The model reached “[4/4 reliability](https://openai.com/index/introducing-chatgpt-pro/)” on 67 percent of questions and got 74 percent of individual attempts correct. More interesting than the aggregate stats, though, was the pattern of failure: o1 pro mode struggled badly with vision. It often misread diagrams, dropped key paths from network problems, or simply failed to extract basic information from images, especially in more visual problems at the Grade 5–6 level.

My conclusion at the time was that students could still not reliably offload standard homework or test questions to an AI, and multimodal problems were often especially safe.

That is no longer the case.

## This Year’s Setup

For the GPT-5 run, I wanted continuity with last year’s experiment, but I also wanted to close off some obvious loopholes. If the model really has improved, it should perform well even when I am not going out of my way to “prompt engineer” its success.

### Question Source

I again used the [CEMC Problems of the Week](https://cemc.uwaterloo.ca/resources/potw), drawing from a new set of questions from the current academic year. Instead of 60 questions, I used 50, spread across multiple grade bands and topics, including geometry, number sense, and algebraic reasoning as they were released.

For someone with no budget and lack of time, this is my only realistically feasible way to try to ensure that these exact questions were not already in the training data, though at this point I have to assume that questions with similar patterns and structures are present.

### Prompts, Images, And “Thinking Mode”

Last time, the vision model was clearly the weak link (and I had a weaker understanding of how LLM inputs worked), so I wanted to test whether that had changed while making my input generally better for an LLM. To do that, I:

* Attached high-quality image files of the questions whenever they were provided as PDFs with diagrams.
* Also copy-pasted the text of each question into the chat. This removed some of the obvious “you failed because OCR is hard” excuses, while still leaving diagrams and visual structure in play.
* Used a very simple core instruction:
> Solve the following. Clearly explain how you arrived at your result. Use code if necessary.
* For trials in the “no code” condition, I simply omitted the last sentence.
* Explicitly told GPT-5 to use the attached images “as needed” but did not coach it heavily on how.

[I exclusively used the new “thinking” mode (and later, extended thinking) allowed by GPT-5](https://x.com/OpenAI/status/1968395215536042241). If OpenAI is going to claim that extended deliberation leads to better reasoning, it seemed only fair to force the model to think.

### More on The Code Prompt vs No-Code Prompt

One practical question for educators is whether it matters if a student explicitly asks the model to use tools like a code interpreter.

To probe that, I set up two conditions:

1. A “use code” prompt where I explicitly encouraged the model to call upon code or other tools if helpful.
2. A “no code mentioned” prompt, where I did not tell it to use tools at all.

For each of the 50 questions, GPT-5 answered it four times under each condition. That gave me 200 attempts with “use code” and 200 without, 400 total.

There was also one small, but hopefully not substantial, change near the end of testing. When GPT-5.1 rolled out in mid-November, my default “robotic” personality setting shifted to “efficient” with two questions left. If the model’s persona had a substantial effect on its actual mathematical performance, that would be worth knowing. In practice, I saw no obvious impact.

### The Results

The headline numbers bear repeating, because they are why this follow-up exists at all. They are also why I am never going to bother with this particular test again.

**4/4 reliability:**
* 48 out of 50 questions reached 4/4 reliability with the “use code” prompt.
* 48 out of 50 questions reached 4/4 reliability without it.

**Per-attempt accuracy:**
* 392 out of 400 individual attempts were correct.
* That is a success rate of 98 percent, or roughly one failure out of every fifty attempts.

In practice, only two questions ever produced wrong answers. As before, they were questions that likely stumped the image model used by GPT-5. One involved [calculating the area of different spaces in a rectangular park](/docs/potwb-25-g-n-02-s-2519.pdf); the other involved [“writing a program” (think pseudocode) to direct a robot through a visual maze](/docs/potwb-25-c-g-08-s-70409.pdf).

If you care about what students can do in real classrooms, this shift matters more than the jump from, say, 74 percent to 80 percent. Last year, letting an LLM do your math homework was like using an unreliable calculator that gives you the wrong answer about one time in four. This year, it is more like a calculator that flickers once every few dozen questions.

[Ethan Mollick has pointed out that, despite being weak at math a year ago, current models now dominate hard STEM contests like the International Mathematical Olympiad and other Olympiads](https://x.com/emollick/status/1977460160197956089). Robert Ghrist, a professor of mathematics and engineering at Penn, [has commented that he now has to work hard to design unambiguous numerical problems that GPT-5-Pro cannot solve, something that was “totally different even 4–6 months ago.”](https://x.com/robertghrist/status/1977462421154419015) My CEMC experiment is a small, classroom-scale echo of that broader step change.

That level of reliability is enough to undermine the integrity of any assessment that assumes students cannot trivially get correct answers on demand.

### Tool Calls, Prompting, And Why Our Training Is Out Of Date

The most interesting finding was what did not matter.

I saw no meaningful difference between runs where I explicitly prompted “use code if helpful” and runs where I said nothing about tools at all. GPT-5 seemed to decide independently whether or not to call its own tools during the hidden thinking stage. In at least one instance, I saw it “debate” tool use internally: it would think for a while, consider using code, decide against it, then proceed with a manual derivation anyway.

Overall, for usability this is impressive. It means that “tool use” is now something the model can manage on its own, rather than something we gate through prompts. Students do not need to understand when code is appropriate. The system can allocate tool use for them.

This aligns [very closely with Mollick’s argument](https://x.com/emollick/status/1982889485873623098) that as models get larger and better, they become more capable of inferring intent, and the detailed “prompt formulas” we have been teaching become less relevant. He has been blunt about the fact that many organizations are now heavily invested in training practices that were appropriate for models from six months ago, but not for the ones we are actually using today. Reasoning models make chain-of-thought prompting less important. What matters more is context, clear goals, and giving the AI a well-defined job.

A lot of teacher PD and corporate “AI workshops” are still organized around magic acronyms, rigid templates, and the promise that if you follow a particular prompt recipe, the AI will finally work. At 98 percent accuracy on non-trivial problems, my experience matches Mollick’s. The hard part is no longer “how do I get this to function at all,” but “how do I design tasks and systems around the fact that this mostly just works.”

### Vision And Geometry Are Still A Lagging Edge

Some of the old weaknesses persist, although they are now narrower and more subtle.

A few patterns stood out:

* **Image parsing is still slower than text only.** Problems that relied heavily on diagrams, especially in geometry, took slightly longer in the thinking phase than comparable text-only problems. This was true even at lower grade levels.
* **Geometry diagrams remain tricky.** The model did very well on number bars, basic graphs, and visually structured but simple numeric diagrams. It was more likely to struggle when a problem relied on inferring relationships from a geometric diagram with several overlapping pieces of information.
* **Text redundancy helps.** Copy-pasting the text of the question while also attaching the image seemed to resolve many of the failures I saw last year. The model was able to rely on the text for structure and use the image as a reference rather than a sole source of truth.

One of the small but telling shifts was how often it got the parts of visualization right. Last year, I would not have trusted an LLM to correctly illustrate a number line with labeled fractions for my students without careful checking. This year, I watched it place numbers correctly and explain the reasoning in ways that were usable for teaching.

### Using GPT-5 As A Teaching Tool

If GPT-5 can now clear a non-trivial, curriculum-aligned math benchmark with 98 percent accuracy, the question is not just “can students cheat with this” but “what would it look like to use this responsibly in instruction.”

A few possibilities are already clear:

* **Study mode/prompt equivalents as a personal tutor.** ChatGPT’s study features can walk a student through a problem with step-by-step hints, targeted questions, and tailored feedback. In my tests, the same model that reliably solved CEMC problems could also dial back and scaffold partial understanding reasonably well. I still find it annoyingly sycophantic and too agreeable, but the basis of a great, on-demand tutor is there.
* **Visual explanations and animations.** The fact that it can correctly interpret and produce number lines, basic function plots, and concrete visualizations means it can generate assets on the fly that I used to have to hand-craft or dig out of textbooks. For example, the new Gemini 3.0 model seems [remarkably well suited to creating things as complicated as Hydro Physics Labs](https://x.com/MattVidPro/status/1990880204760252834), and [explained probability simulations](https://gemini.google.com/share/75562ce3ee5d).

As these are still probabilistic models, quality is not uniform across responses, even for the same question. Sometimes the explanations are clumsy or overly verbose. Sometimes it skips a pedagogically important step that may confuse a younger learner. There may well be differences in how it explains things depending on which personality or mode is selected, or whether you nudge it to “explain this to a Grade 8 student” versus “show all formal steps.”

Further, [GPT-5.1 now exposes personality controls that let you pick from predefined styles or define your own, with OpenAI’s own documentation encouraging you to “customize your ChatGPT personality.”](https://help.openai.com/en/articles/11899719-customizing-your-chatgpt-personality) In practice, I have seen examples where different personality settings give fundamentally different styles of advice, including different suggested breathing patterns for a presenter and different role expectations. As a teacher, I really want more clarity on the functional implications of AI personality. If one student uses “Warm and Encouraging” and another uses “Efficient and Direct,” are they getting subtly different mathematical norms and expectations from the same underlying model?

The baseline, though, is now that students have access to a free or low-cost AI tool which can already act as a reasonably competent math tutor. It might not replace a skilled teacher, but it will absolutely replace a large share of what homework, extra practice, and worked examples used to look like.

## AI As A Mathematical Collaborator

If this were only about middle school or high school math, we might still tell ourselves a comforting story: “Sure, it can do worksheets, but serious mathematics is safe.”

[Scott Aaronson](https://en.wikipedia.org/wiki/Scott_Aaronson), an American theoretical computer scientist best known for his work on quantum computing and computational complexity theory, recently described, for the first time, a research paper where a key technical step in the proof of the main result was supplied by an AI, using GPT-5-Thinking. He was clear that if a student had handed him the same argument, he would have called it clever. [In his longer write-up](https://scottaaronson.blog/?p=9183), Aaronson points out that an AI that “merely” fills in the insights that should have been obvious to you is still a huge deal for real research, because it speeds up the actual discovery process, not just the LaTeX or bibliography.

[Terence Tao](https://en.wikipedia.org/wiki/Terence_Tao), widely regarded as one of the greatest living mathematicians, [has written about using extended conversations with an AI to help answer a nontrivial MathOverflow question](https://mathstodon.xyz/@tao/115306424727150237). He had already done theoretical work suggesting a particular answer, but used AI-assisted heuristic calculations to locate feasible parameters for a counterexample, then verified them with a simple program. Without AI, he suggests he probably would not even have attempted that numerical search.

At multiple levels of mathematical practice, from contest problems to classroom exercises to research-level work, there is growing evidence that modern models are not just “good at math for a chatbot.” They are becoming useful collaborators.

When people operating at the frontiers of mathematical research are saying “this noticeably sped up my work” and “this suggested a clever key step,” it becomes very hard to maintain the fiction that high school algebra is out of reach.

### AI And Academic Scholarship More Broadly

The same pattern shows up outside mathematics. [A recent paper on AI and academic publishing](https://arxiv.org/pdf/2510.02408), [summarized by Jay Van Bavel](https://x.com/jayvanbavel/status/1977035822554616112), found that researchers using generative AI published substantially more papers and that the quality of those papers, as measured by journal impact factors, also rose. The productivity gap between AI users and non-users grew from about 15 percent in 2023 to over a third in 2024. There were also disproportionate gains for early-career researchers and authors from non-English-speaking countries, suggesting that AI is not just increasing output, but also helping level parts of the playing field.

In other words, AI is not just good enough to help my Grade 8 students fake their homework. It is already altering the trajectory of academic careers and research output.

We can argue about whether this is good or bad, or about what “authorship” and “scholarship” should mean in this context. But we can no longer argue, in good faith, that these tools are marginal or that we have ample time before they matter.

## Institutions, Benchmarks, And “Job Interviewing” Your Models

This creates a problem for institutions that like clean policies and slow cycles, which is most of education.

Mollick has argued that as AI models get better and more embedded in work, organizations need to stop relying on vibes and generic benchmarks. In his “[giving your AI a job interview](https://www.oneusefulthing.org/p/giving-your-ai-a-job-interview?publication_id=1180644&post_id=178292321&isFreemail=true&r=sd5pm&triedRedirect=true)” piece, he points to research like GDPval, which shows performance varying significantly by task even among top models, and to cases like “GuacaDrone,” where different models offer systematically different advice on ambiguous, judgment-heavy questions.

It is not enough to know that a model scores well on some broad benchmark like MMLU. You need to know what your model does on your tasks, including the ways it might be systematically better or worse, more or less risk-seeking, more or less conservative. That requires realistic scenarios, repeated trials, and expert review, and it is not a one-time effort. You need to do it multiple times a year as new models are released and old ones drift.

My CEMC experiment is, in a very modest way, an example of this kind of local benchmarking. I took a real question source that actually appears in the lives of my students, defined a simple reliability framework, and ran repeated trials. The result was not “GPT-5 scored 98 percent on a leaderboard,” but “GPT-5 will almost always get the problems my students do in class correct, using minimal prompting.”

Last year, I wrote that I did not know a single school, district, or board meaningfully allocating time and personnel to rigorously test emerging models against internal, context-specific benchmarks. That is still true. What has changed is that the models have leapt forward while the institutional response has mostly stayed frozen.

At this point, saying “we need to wait and see how good these things get” is not a serious position. For most of the math our students do, they are already good enough.

## Limitations and Caveats

None of this is a peer-reviewed study. I am still a classroom teacher with severe time constraints, running tests in the margins of a very busy job.

There are real limitations here:

* **Sample size and scope.** Fifty questions at four trials under two conditions is not a massive dataset. It is, however, enough to capture the qualitative shift from “coin flip” to “near certainty.”
* **Single question source.** I again used only CEMC Problems of the Week. These are good and varied, but they are not the full universe of math problems students will encounter. Different curricula or exam boards might present challenges that this test did not.
* **Rapid model drift.** The jump from GPT-5 to 5.1, which happened while I was still finishing the tests, is a reminder that these systems are moving targets. Gemini 3.0 released a few days after I ran the last set of problems, and its benchmarks now eclipse every other model on the market. The numbers here are true enough for this snapshot in time. Six months from now, they will almost certainly be outdated.

Despite all that, the direction of travel is clear enough. The worrying part to me is not that GPT-5 can ace a CEMC worksheet. It is that institutions are still writing policies and designing assessments as if last December’s performance is the ceiling.

## Where This Leaves The Classroom

So where does this leave a classroom now?

For one, we can no longer responsibly tell ourselves that standard secondary math homework is a strong measure of student understanding. If a student wants to outsource everything to an AI, the friction is now vanishingly small and the error rate is low enough that they can coast for quite a while before it catches up to them.

It also means that “just use images” is no longer a robust defense for take-home tasks. Vision remains imperfect, especially for complex geometry, but it is not a safe harbor. If something can be cleanly described in text and solved with symbolic or numeric reasoning, GPT-5 is probably already good at it.

Personality customization adds another wrinkle. If different students pick different AI “vibes” and get different types of explanations, hints, and levels of hand-holding, we will need to think carefully about equity, scaffolding, and what we count as independent work. The same underlying model might behave like a patient tutor for one student and an efficiency-obsessed problem solver for another.

None of this means it is time to give up on math education. It means we have to be much more intentional about:

* Designing tasks that demand genuine sense-making, not just correct answers.
* Building in live, in-class performance that AI cannot easily fake.
Explicitly teaching students how to use these tools as partners in their learning rather than as answer vending machines.
* Developing local benchmarks and repeated tests of the tools we actually deploy, rather than relying on marketing claims and generic leaderboards.

Last year, I ended by telling my students that they still had to do the heavy lifting. This year, I think the more honest message is that the heavy lifting has shifted. They may not need to grind as many practice problems by hand, but they absolutely need to learn how to question, interpret, and extend the work that an AI hands them.

If we do not teach that, someone else, or something else, will.

[^1]: You can find an archive of the questions I used at the [CEMC website](https://cemc.uwaterloo.ca/resources/potw). It is the first 10 questions for each level set from 2025/2026. I also have an archive, which you can contact me to obtain.
[^2]: You can [download a recording of my results as an XLSX file](/docs/potw-gpt5-thinking-test-results.xlsx).
