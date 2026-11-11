/*
 * Additional demo voices and posts in LinkedIn / X formats:
 * long-form professional posts, short takes, and comment threads.
 *
 * All content is original fiction written for the demo. Company names are
 * invented; the people are seeded demo accounts, not real individuals.
 */

const ALL = ["student", "faculty", "alumni"];
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

const users = [
  {
    key: "meera",
    name: "Meera Iyer",
    email: "meera.iyer@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2013",
    passing_year: "2017",
    location: "Bengaluru, India",
    designation: "Product Manager",
    organisation: "Tessellate",
    working_area: "Fintech Infrastructure",
    skills: ["Product Strategy", "Fintech", "SQL", "User Research"],
    bio: "Product manager working on payments infrastructure. Ex-backend engineer. Writes about ambiguity, metrics and the unglamorous parts of product work.",
  },
  {
    key: "kabir",
    name: "Kabir Shah",
    email: "kabir.shah@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2012",
    passing_year: "2016",
    location: "Remote",
    designation: "Founder & CTO",
    organisation: "LedgerLoop",
    working_area: "Startups",
    skills: ["Startups", "Distributed Systems", "Go", "Fundraising"],
    bio: "Founder and CTO at LedgerLoop. Building reconciliation infrastructure for small finance teams. Interested in go-to-market, hiring and boring reliability.",
  },
  {
    key: "ananya",
    name: "Ananya Verma",
    email: "ananya.verma@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2014",
    passing_year: "2018",
    location: "Amsterdam, Netherlands",
    designation: "Data Scientist",
    organisation: "Northwind Health",
    working_area: "Causal Inference",
    skills: ["Causal Inference", "Python", "Healthcare", "Statistics"],
    bio: "Data scientist working on clinical and operational questions where randomised trials are not always possible. Recovering overconfident analyst.",
  },
  {
    key: "rahul",
    name: "Rahul Nair",
    email: "rahul.nair@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2013",
    passing_year: "2017",
    location: "Singapore",
    designation: "Site Reliability Engineer",
    organisation: "Meridian Cloud",
    working_area: "Reliability Engineering",
    skills: ["SRE", "Kubernetes", "Observability", "Incident Response"],
    bio: "SRE working on multi-tenant platforms. Cares about error budgets, postmortems without blame, and runbooks that people actually use.",
  },
  {
    key: "neha",
    name: "Dr. Neha Bansal",
    email: "neha.bansal@iiita.ac.in",
    role: "faculty",
    program: "PhD",
    starting_year: "2010",
    passing_year: "2016",
    location: "Prayagraj, India",
    designation: "Faculty, Human-Computer Interaction",
    organisation: "IIIT Allahabad",
    working_area: "Applied ML & HCI",
    skills: ["HCI", "Applied ML", "Research Methods", "Evaluation"],
    bio: "Faculty member working on human-centred AI and interactive systems. Advises students on research writing, evaluation design and industry collaborations.",
  },
  {
    key: "ishaan",
    name: "Ishaan Kulkarni",
    email: "ishaan.kulkarni@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2016",
    passing_year: "2020",
    location: "Mumbai, India",
    designation: "Quant Researcher",
    organisation: "Meridian Quant",
    working_area: "Quantitative Research",
    skills: ["C++", "Probability", "Time Series", "Market Microstructure"],
    bio: "Quant researcher. Previously a backend engineer. Interested in probability, clean experiments and explaining assumptions before answers.",
  },
  {
    key: "tara",
    name: "Tara Singh",
    email: "tara.singh@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2015",
    passing_year: "2019",
    location: "Berlin, Germany",
    designation: "Staff Product Designer",
    organisation: "Kite & Compass",
    working_area: "Design Systems",
    skills: ["Product Design", "Design Systems", "Accessibility", "Figma"],
    bio: "Staff designer building design systems for dense enterprise tools. Interested in the organisational side of adoption, not just tokens and components.",
  },
];

const channels = ["Startups", "Higher Studies"];

const posts = [
  {
    author: "aarav",
    heading: "The production ML checklist I wish I had at 23",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(6),
    text: `<p>I shipped my first production model at 23 with a notebook, a cron job and a great deal of confidence. It worked in the demo. It failed in the first real week, in a way that took three days to understand.</p>
<p>Since then I have kept a checklist. It is deliberately boring. Most production ML failures I have seen were not modelling failures.</p>
<p><strong>1. Write the data contract before the model.</strong> Who produces each field, how often, what happens when it is late, and what "missing" means. If you cannot answer those, you do not have a dataset; you have a snapshot.</p>
<p><strong>2. Separate the decision from the score.</strong> A model outputs a number. A product makes a decision with a threshold, a human review step or a fallback. Write that decision down and test it independently.</p>
<p><strong>3. Build an evaluation set you did not train on, and freeze it.</strong> Then add a second, newer set. The first tells you whether the model learned anything. The second tells you whether the world moved.</p>
<p><strong>4. Log inputs, outputs and the model version together.</strong> Not just metrics. When something goes wrong, you need to replay the actual request.</p>
<p><strong>5. Decide what "good enough" means in user terms.</strong> "AUC 0.87" is not a user outcome. "Fewer than 1 in 20 flagged items is wrong" is.</p>
<p><strong>6. Plan the rollback before the rollout.</strong> A feature flag is not a rollback plan if the downstream state has already changed.</p>
<p><strong>7. Give someone an on-call runbook.</strong> If the person who built the model is unavailable, what does the first responder check? If the answer is "wake the ML person", the system is not production-ready.</p>
<p>The uncomfortable part: none of this is glamorous, and none of it shows up in a model card. But it is the difference between a demo and a system.</p>
<p>What would you add to the list? I am especially interested in the checks people learned the hard way.</p>`,
  },
  {
    author: "meera",
    heading: "What PM interviews actually test (and what they do not)",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(15),
    text: `<p>I have sat on both sides of product interviews for six years. The biggest misconception candidates have is that the interview is a test of ideas. It is mostly a test of judgment under ambiguity.</p>
<p>Here is what I am actually evaluating:</p>
<p><strong>Can you find the real problem?</strong> Most candidates jump to a solution in the first two minutes. Strong candidates spend time on who is affected, what they do today, and why the current workaround is insufficient.</p>
<p><strong>Can you prioritise without hiding?</strong> I will give you three plausible directions and a fixed team. I want to hear a trade-off, not a list. "We do A first because it unblocks B, and we accept that C gets worse for one quarter" is a real answer.</p>
<p><strong>Can you define a metric that would change your mind?</strong> Not a dashboard. A decision rule. If the metric moves by X, we ship; if it moves by Y, we stop.</p>
<p><strong>Can you communicate a decision to people who disagree?</strong> I often ask candidates to explain a controversial call to an imaginary sales lead. The best answers acknowledge the cost instead of pretending there is none.</p>
<p>What I am not testing: whether you know our roadmap, whether you have read the same product books, or whether you can produce a perfect framework. Frameworks are scaffolding. Judgment is the job.</p>
<p>One practical tip: when you get a case, repeat the goal back in one sentence before you start. Half the candidates I reject are not wrong; they are solving a different problem than the one I asked.</p>
<p>For anyone preparing: what is the hardest product interview question you have faced? I will try to answer a few in the comments.</p>`,
  },
  {
    author: "kabir",
    heading: "We almost ran out of money building the wrong thing",
    channel: "Startups",
    visibility: ALL,
    date: hoursAgo(23),
    text: `<p>We had eleven months of runway and a product nobody urgently needed. I want to write down what happened, because the version I told at demo day was much tidier.</p>
<p>We started with a reconciliation tool for finance teams. We built a beautiful dashboard, integrations with three banks, and a permissions model. Customers said it looked great. They did not pay.</p>
<p>For four months we interpreted "looks great" as "almost sold". We added features. We hired one more engineer. We kept the same five design partners, all of whom were polite and none of whom had budget authority.</p>
<p>The thing that saved us was an uncomfortable question from an investor: "Who signs the cheque, and what do they lose if this does not exist?" We could not answer it. We had been selling to people who felt our pain but did not own it.</p>
<p>We cut the roadmap to one workflow: month-end reconciliation for a 3-10 person finance team. We removed two integrations and the entire admin console. We charged from the first call, even before the product was ready. Three of the next ten conversations converted. The previous five "design partners" had converted at zero.</p>
<p>Lessons, in order of how much they cost me:</p>
<ul>
<li>Sell before you build the second integration. The first one is for learning; the second is usually procrastination.</li>
<li>"Would you pay for this?" is a weak question. "Can I send you an invoice today?" is a strong one.</li>
<li>Your design partners are not a market. They are a sample, and often a biased one.</li>
<li>Runway is a product constraint, not a finance constraint. It should change what you build every single week.</li>
</ul>
<p>We are still here, but we are a smaller, less impressive-looking company than the one in our old deck. The product is worse to demo and much better to buy.</p>
<p>If you are building something now: what is the smallest version someone would pay for this month?</p>`,
  },
  {
    author: "ananya",
    heading: "Causal inference is not a fancy regression",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(31),
    text: `<p>Every few months someone sends me a model with a treatment variable, a pile of controls and a coefficient, and asks whether it "proves" the effect. Usually it does not. Adding controls to a regression is not the same as identifying a causal effect.</p>
<p>The question is not "what is correlated with the outcome?" It is "what would have happened to the same unit under a different treatment?" That counterfactual is fundamentally missing from observational data, so we have to argue for it.</p>
<p>Three things I check before I trust a causal claim:</p>
<p><strong>1. What is the assignment mechanism?</strong> If treatment is chosen by people, by policy, or by a threshold, that mechanism is part of the analysis. Ignoring it means the controls are doing work they cannot do.</p>
<p><strong>2. Draw the graph.</strong> A DAG forces you to say what causes what, and which variables are confounders, mediators or colliders. "Control for everything" is not a strategy; it can introduce bias.</p>
<p><strong>3. Define the estimand.</strong> Average effect across whom? Over what window? A treatment that helps severe cases and hurts mild ones can have a null average and a very real clinical decision inside it.</p>
<p>When a randomised experiment is possible, run it. When it is not, use designs that make the comparison explicit: difference-in-differences with a credible parallel-trends argument, regression discontinuity where a real threshold exists, instrumental variables with a defensible exclusion restriction.</p>
<p>And please, report the sensitivity analysis. The honest version of a causal claim includes the assumption that would break it.</p>
<p>I am curious how other people handle this in industry: what is the one assumption you always write down before presenting an observational result?</p>`,
  },
  {
    author: "rahul",
    heading: "The incident that taught me to stop hero-worshipping uptime",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(41),
    text: `<p>We spent a quarter chasing 99.99% on a service that most users touched twice a month. We got there. Then we had the worst customer week of the year, and the dashboard stayed green the entire time.</p>
<p>The incident started with a configuration change that was technically within our SLO. Latency rose by 400 ms at p99 for one endpoint. Error rate stayed flat. Our alerting, built around availability, did not fire. The users who noticed were the ones doing a long, multi-step task: every extra 400 ms compounded into a visibly broken workflow.</p>
<p>We had optimised the metric we could measure, not the experience people cared about. The postmortem was uncomfortable for a reason I did not expect: nobody had done anything reckless. Every team had hit its target.</p>
<p>What we changed:</p>
<ul>
<li>Added a task-level SLO: "complete a reconciliation in under 90 seconds at p95", measured end to end.</li>
<li>Made latency budgets explicit per dependency. A service could not spend the whole budget because it was convenient.</li>
<li>Replaced "did the system stay up?" alerts with "are users completing the task?" alerts.</li>
<li>Started reviewing error budgets monthly with product, not just engineering.</li>
</ul>
<p>The hardest part was cultural. Uptime is easy to celebrate. Task success requires admitting that a technically healthy system can still be failing people.</p>
<p>If you run a service, what is the user-level metric that would catch a failure your availability dashboard misses?</p>`,
  },
  {
    author: "neha",
    heading: "What I look for in a research collaborator",
    channel: "Higher Studies",
    visibility: ALL,
    date: hoursAgo(49),
    text: `<p>I get a lot of emails from students asking to collaborate. Most are polite and generic. The ones I remember have three things in common, and none of them is a perfect CV.</p>
<p><strong>They have read something I wrote.</strong> Not skimmed the abstract. They can say which claim they found surprising and why. That single sentence tells me more than a paragraph of praise.</p>
<p><strong>They bring a concrete question.</strong> "Can we work on HCI?" is not a question. "In your study, participants over-trusted the explanation panel; I want to test whether showing uncertainty changes that behaviour" is a question I can respond to.</p>
<p><strong>They are reliable before they are brilliant.</strong> I would rather work with someone who sends a short, honest update every Friday than someone who disappears for a month and returns with a brilliant half-finished draft. Research is mostly follow-through.</p>
<p>Two things I do not need: a long list of tools, and an apology for your background. I care about how you think, how you write, and whether you tell me when something is not working.</p>
<p>If you are writing to a faculty member this week: mention one specific paper, ask one specific question, and say what you can commit to. Three short paragraphs is enough.</p>
<p>Students and alumni: what makes a research email stand out to you, from either side?</p>`,
  },
  {
    author: "ishaan",
    heading: "Why I left a comfortable SDE job for quant research",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(57),
    text: `<p>I liked my backend job. Good team, predictable work, a manager who protected us. I left anyway, and it took me two years to understand why.</p>
<p>I kept noticing that the questions I found interesting were not the ones my job rewarded. I wanted to know whether a signal was real, not just whether the service was up. I wanted to argue about base rates at lunch. I wanted the probability, not the deploy.</p>
<p>The switch was not romantic. My first six months were mostly catching up on probability and statistics I had skipped in college. I wrote bad experiments, overfit small samples, and confused a plausible story with evidence. My background as an engineer helped me build tooling and debug pipelines; it did not help me reason about uncertainty.</p>
<p>What actually helped:</p>
<ul>
<li>Redoing the basics with problems, not videos. Probability, inference, linear models, then time series.</li>
<li>Keeping a lab notebook of every experiment, including the ones that failed.</li>
<li>Finding someone senior who would tell me when my reasoning was sloppy.</li>
<li>Treating interviews as a diagnostic: the questions I could not answer were the syllabus.</li>
</ul>
<p>The trade-off is real. The work is less clearly "done" at the end of the day, the feedback loops are longer, and the ego cost of being wrong is higher. I am still glad I moved.</p>
<p>For anyone considering a similar jump: what is the one skill you wish you had built before switching?</p>`,
  },
  {
    author: "tara",
    heading: "Design systems fail for organisational reasons, not technical ones",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(65),
    text: `<p>I have now seen four design systems fail, and none of them failed because the tokens were wrong. They failed because the system had no owner, no adoption path, or no reason for product teams to care.</p>
<p>The pattern is predictable. A small team builds a beautiful component library. It ships with documentation. Adoption is announced in a meeting. Six months later, half the product still uses bespoke components, the library is two versions behind, and everyone agrees the system "needs a refresh".</p>
<p>What actually made a difference in the system that survived:</p>
<p><strong>Governance was explicit.</strong> We named who could approve a new component, how long a deprecated component would live, and what teams got in exchange for migrating.</p>
<p><strong>We measured adoption by user flow, not by import count.</strong> A team importing the button but wrapping it in three custom variants was not adopting the system.</p>
<p><strong>We made the right thing easier.</strong> One command to upgrade, codemods for the common cases, and a weekly office hour where teams could bring a real screen.</p>
<p><strong>We treated accessibility as a release criterion.</strong> Not a checklist at the end. If a component failed keyboard navigation, it did not ship.</p>
<p>The technical work is maybe 30% of the job. The rest is negotiation, incentives and maintenance. That is less fun to demo and much more useful to users.</p>
<p>For design and frontend folks: what is the one organisational change that made your design system stick?</p>`,
  },
  {
    author: "sneha",
    heading: "Reading a CV paper in 90 minutes: my actual process",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(73),
    text: `<p>People often ask how I keep up with computer vision papers. The honest answer is that I do not keep up. I read a small number carefully and ignore most of the rest. Here is the process I use when a paper actually matters.</p>
<p><strong>0-10 minutes: title, abstract, figures.</strong> If the figures do not make the claim legible, the paper is going to be hard work. I read every caption before the introduction.</p>
<p><strong>10-25 minutes: the method, at the level of inputs and outputs.</strong> What goes in, what comes out, what is trained, what is frozen. I sketch the pipeline on paper. If I cannot sketch it, I do not understand it yet.</p>
<p><strong>25-45 minutes: the experiments.</strong> What is the baseline? Is it strong? What is the ablation actually isolating? Are the gains consistent across seeds and datasets, or is this one lucky run?</p>
<p><strong>45-70 minutes: reproduce one number.</strong> Not the whole paper. One table cell, if code is available. This is where most of my confidence comes from.</p>
<p><strong>70-90 minutes: write five lines.</strong> The claim, the evidence, the assumption I doubt, the experiment I would run next, and whether it changes anything I do.</p>
<p>The five lines are the point. A paper I cannot summarise in five lines is a paper I have not read, even if I spent two hours on it.</p>
<p>What is your version of this? I am always looking for a better process.</p>`,
  },
  {
    author: "priya",
    heading: "Evaluation is a product problem",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(81),
    text: `<p>Teams treat evaluation as a modelling task. It is usually a product task wearing a lab coat.</p>
<p>A metric only matters if it maps to a decision someone makes. If the output goes to a human reviewer, the relevant question might be "how often is the top suggestion wrong in a way that wastes five minutes?" If it goes directly to a user, the question might be "how often does the system refuse when it should have answered?" Those are different eval sets, different thresholds and different launch criteria.</p>
<p>Three failure modes I see repeatedly:</p>
<p><strong>1. The eval set is a museum.</strong> It was collected once, from early users, and never refreshed. The model improves on it while the product gets worse in production. Keep a frozen set for comparability and a rolling set for reality.</p>
<p><strong>2. The label is a committee.</strong> Three annotators, no guideline, no disagreement analysis. You end up measuring annotator mood. Write the guideline, measure agreement, and keep the disagreements; they are often the interesting cases.</p>
<p><strong>3. The average hides the decision.</strong> A single accuracy number can look fine while the model is systematically bad on the segment that matters most. Break the metric down by user intent, language, and input length.</p>
<p>Before you ask "which model is better?", ask "better at what decision, for whom, and what would we do differently if the number changed?" If there is no answer, the evaluation is theatre.</p>
<p>I would love examples from other teams: what is the most useful non-standard eval metric you have shipped with?</p>`,
  },
  {
    author: "riya",
    heading: "The migration postmortem: 7 things that actually mattered",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(89),
    text: `<p>We finished a year-long distributed-systems migration last month. The public story is "we moved and it worked". The useful story is the list below.</p>
<ul>
<li><strong>We wrote down what would not change.</strong> API contracts, latency budgets, and the on-call rotation stayed fixed. That gave us a stable reference point when everything else moved.</li>
<li><strong>We migrated reads before writes.</strong> It felt slow. It let us validate correctness with real traffic before taking on dual-write complexity.</li>
<li><strong>We built the rollback first.</strong> Not a document. A rehearsed path with a named owner and a time limit.</li>
<li><strong>We measured the migration, not the destination.</strong> Every week we tracked divergence between old and new, not just uptime of the new system.</li>
<li><strong>We paid down the dual-write debt immediately.</strong> The temporary code was the most dangerous part of the project.</li>
<li><strong>We told support before we told the company.</strong> They heard the failure modes from us, not from a customer.</li>
<li><strong>We wrote the postmortem before launch.</strong> It forced us to name the risks while we could still change the plan.</li>
</ul>
<p>The boring parts were the parts that worked. The clever parts were the parts we had to remove.</p>
<p>What is the one migration lesson you would add?</p>`,
  },
  {
    author: "dev",
    heading: "Frontend to platform engineering: what transferred?",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(97),
    text: `<p>I moved from product frontend to platform engineering two years ago. People assume it was a hard reset. It was not, but the overlap was not where I expected.</p>
<p><strong>Transferred cleanly:</strong> debugging across boundaries, reading unfamiliar code, designing APIs for other humans, and caring about latency because I had spent years watching spinners.</p>
<p><strong>Had to relearn:</strong> thinking in failure domains rather than screens, writing operational docs, and accepting that a platform's "user" is another engineer who will not read your onboarding guide.</p>
<p><strong>Still unlearning:</strong> the instinct to ship a visible improvement every week. Platform work compounds slowly, and the dashboard is often someone else's product.</p>
<p>The biggest surprise was how much of platform engineering is product work: naming, defaults, error messages, migration paths. A good internal API is a UX problem with a compiler.</p>
<p>If you are considering the move, build one thing another team actually uses before you interview. A CLI, a deploy template, a shared library. The feedback will teach you more than any roadmap.</p>
<p>What transferred for you, and what did you have to unlearn?</p>`,
  },
  {
    author: "aditya",
    heading: "Kafka is not a queue (and that matters)",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(105),
    text: `<p>I keep seeing designs that treat Kafka as a queue with a nicer logo. The difference is not academic; it changes how you handle failures, ordering and scale.</p>
<p>A queue usually removes a message when a consumer acknowledges it. A log retains records and lets independent consumer groups read at their own offsets. That means:</p>
<ul>
<li><strong>Replay is a feature, not an accident.</strong> A new consumer can rebuild state from the beginning. A queue would have thrown the history away.</li>
<li><strong>Ordering is per partition, not global.</strong> If you need global order, you need a different design, not a bigger cluster.</li>
<li><strong>Consumer lag is your backlog.</strong> Monitor it per partition. A single hot partition can look fine in aggregate and be hours behind.</li>
<li><strong>Retries need a plan.</strong> Retrying in place blocks the partition. A retry topic with backoff is usually kinder than a tight loop.</li>
</ul>
<p>The operational consequence: your schema and key choice are long-lived API decisions. Changing a partition key later is a migration, not a config change.</p>
<p>What is the most expensive Kafka lesson you have learned?</p>`,
  },
  {
    author: "meera",
    heading: "A 30-minute user interview script for alumni founders",
    channel: "Startups",
    visibility: ALL,
    date: hoursAgo(113),
    text: `<p>Founders ask me for a user interview script, then ignore it and pitch for 25 minutes. Here is the version I actually use. It is designed to make the other person talk.</p>
<p><strong>Warm-up (3 min):</strong> "Walk me through the last time you did this task." Not "do you have this problem?" The last time is concrete.</p>
<p><strong>Current workflow (10 min):</strong> "What did you do first? Then what? Where did you get stuck? What did you do when it broke?" Ask for screenshots if they will share them.</p>
<p><strong>Cost (7 min):</strong> "How long did it take? Who else was involved? What did it stop you from doing?" Time and workarounds are better signals than opinions.</p>
<p><strong>Alternatives (5 min):</strong> "What else did you consider? Why did you reject it?" A spreadsheet and a Slack channel are real competitors.</p>
<p><strong>Close (5 min):</strong> "If this existed tomorrow, what would make you try it? What would make you not try it?" Then stop talking.</p>
<p>Rules: no pitching, no leading questions, no "wouldn't it be great if". If you hear a compliment, ask for a behaviour. If you hear a future promise, ask about the past.</p>
<p>What question do you always ask that is not on this list?</p>`,
  },
  {
    author: "rahul",
    heading: "Runbooks rot. Here is how we keep ours alive",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(121),
    text: `<p>A runbook that nobody has opened in six months is a liability with good formatting. Ours used to be a wiki graveyard. Now they are part of the on-call loop.</p>
<p>What changed:</p>
<p><strong>Every page starts with a signal.</strong> "If you see alert X, start here." Not a table of contents, not a history of the service.</p>
<p><strong>Every step has an expected result.</strong> "Run this query; if the count is zero, go to step 4." A runbook that cannot tell you whether it worked is a suggestion.</p>
<p><strong>We test one runbook per rotation.</strong> During a quiet on-call week, the primary picks a page and follows it in staging. Broken steps get fixed that week.</p>
<p><strong>Incidents update the page they used.</strong> The postmortem action item is not "write a runbook"; it is "patch the page that failed us, and link the incident".</p>
<p><strong>We delete aggressively.</strong> A page for a decommissioned service is worse than no page. Ownership and a review date are mandatory.</p>
<p>The cultural shift was admitting that documentation is operational code. It has bugs, it needs tests, and it goes stale.</p>
<p>How do you keep yours from rotting?</p>`,
  },
  {
    author: "ananya",
    heading: "Three questions before you trust a dashboard",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(129),
    text: `<p>I review analytics dashboards for a living, and most disagreements about numbers are actually disagreements about definitions. Before I trust a chart, I ask three questions.</p>
<p><strong>1. What is the denominator?</strong> "Conversion is up" means nothing until I know whether the base is all visitors, eligible visitors, or visitors who reached a specific step. A metric can improve while the product gets worse if the denominator quietly shrinks.</p>
<p><strong>2. What changed in the pipeline?</strong> A new event, a renamed field, a timezone fix, a bot filter. Most sudden jumps I have investigated were instrumentation changes, not user behaviour.</p>
<p><strong>3. What decision will this chart change?</strong> If the answer is "none, it is informational", fine, but do not put it on the same wall as the metrics that drive action. Dashboards crowd out attention.</p>
<p>One habit that has saved me repeatedly: keep a small "metric definitions" page with the owner, the source table, the filter, and the last review date. When two charts disagree, that page usually explains why.</p>
<p>What is the first thing you check when a number looks too good?</p>`,
  },
  {
    author: "kabir",
    heading: "Hiring your first engineer: signals over pedigree",
    channel: "Startups",
    visibility: ALL,
    date: hoursAgo(137),
    text: `<p>Your first ten hires set the culture more than any values document. Here is what I look for now, after getting it wrong twice.</p>
<p><strong>They have shipped something they had to maintain.</strong> Not just built. Maintained, debugged, and supported. That experience changes how people write code.</p>
<p><strong>They can explain a trade-off without a framework.</strong> Ask about a decision they regret. The best answers include the constraint they misjudged, not just the outcome.</p>
<p><strong>They ask about the business.</strong> Not in a performative way. They want to know who pays, why now, and what happens if the product works. Early engineers make product decisions whether you let them or not.</p>
<p><strong>They are honest about what they do not know.</strong> In a small team, a confident wrong answer is more expensive than an uncertain right question.</p>
<p><strong>They are kind under pressure.</strong> Reference checks should ask about the worst week, not the best project.</p>
<p>Pedigree is a weak signal at this stage. A person who has debugged a production incident at 2 a.m. with a customer on the call is ready in a way a perfect transcript does not capture.</p>
<p>Founders: what signal has predicted success for you?</p>`,
  },
  {
    author: "neha",
    heading: "How to email a professor (without sounding like a template)",
    channel: "Higher Studies",
    visibility: ALL,
    date: hoursAgo(145),
    text: `<p>I receive about fifteen student emails a week. I answer the ones that are specific, short and clearly written by a person who has done a little homework.</p>
<p>A good structure:</p>
<p><strong>Subject:</strong> one line that says what the email is about. "Prospective MS student interested in uncertainty interfaces" beats "Request".</p>
<p><strong>Paragraph 1:</strong> who you are and what you are asking for. One or two sentences.</p>
<p><strong>Paragraph 2:</strong> the specific connection. A paper, a project, a talk. Say what caught your attention and what question it raised.</p>
<p><strong>Paragraph 3:</strong> what you can commit to and what you need. A CV, a 10-minute call, a reading list. Make it easy to say yes or no.</p>
<p>Attach one PDF, not five. Do not ask "any opportunity?" if you mean "do you have funding?" Be direct; it is kinder to everyone.</p>
<p>And if you do not get a reply, one gentle follow-up after ten days is fine. More than that is not persistence; it is pressure.</p>
<p>What is the best cold email you have received, and why did it work?</p>`,
  },
  {
    author: "aarav",
    heading: "Hot take: most ML infrastructure problems are data contract problems",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(3),
    text: `<p>Most of the "ML infrastructure" incidents I have debugged were not infrastructure incidents. They were data contract incidents wearing a pager.</p>
<p>A field changed type. A null became a string. A producer started sending yesterday's timestamp. The model did exactly what it was trained to do with garbage, and the dashboard stayed green because the request succeeded.</p>
<p>Before you add a feature store, write down the contract: schema, owner, freshness, null semantics, and a validation check that fails loudly. It is less exciting and more effective.</p>`,
  },
  {
    author: "ishaan",
    heading: "The best interview habit I have seen",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(9),
    text: `<p>I interviewed about 40 candidates this year. The strongest ones did the same thing: they stated their assumptions before their answer.</p>
<p>"Assuming the data is stationary and the sample is representative, I would..." That one sentence tells me they know where the answer can break. It also makes the rest of the conversation much easier.</p>`,
  },
  {
    author: "tara",
    heading: "Accessibility is not a phase",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(18),
    text: `<p>Accessibility is not a phase. If it is a phase, it is a bug.</p>
<p>If your process can ship a component that fails keyboard navigation, the process is the problem, not the component. Put it in the definition of done or stop pretending it is a value.</p>`,
  },
  {
    author: "sathvik",
    heading: "Looking for one alumnus who has shipped a real recommender",
    channel: "General",
    visibility: ALL,
    date: hoursAgo(26),
    text: `<p>I am looking for one alumnus who has shipped a real recommendation or ranking system to production. Not a tutorial, not a Kaggle notebook. Something with users, a metric, and at least one thing that went wrong.</p>
<p>I have questions about cold start, evaluation and how you balanced relevance with diversity. I would rather hear one honest war story than ten blog-post summaries. Comment or DM if you are open to a 20-minute conversation.</p>`,
  },
  {
    author: "priya",
    heading: "If your eval set and your model share an author...",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(36),
    text: `<p>If your eval set was built by the same person who built the model, you have a demo, not an evaluation.</p>
<p>Not because anyone is cheating. Because the same assumptions leak into both. Get someone who did not build the model to write the hardest examples they can think of.</p>`,
  },
  {
    author: "sneha",
    heading: "Read the figures before the introduction",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(46),
    text: `<p>Paper reading tip: read the figures and captions before the introduction. If the figures do not convince you, the prose will not either.</p>
<p>The intro tells you what the authors hope the paper says. The figures tell you what it actually shows.</p>`,
  },
  {
    author: "aarav",
    heading: "A cold DM template that actually gets replies",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(54),
    text: `<p>I get a lot of cold messages. The ones I reply to are short, specific and easy to answer. Here is the template I use when I am the one asking:</p>
<p>"Hi [name] — I read your post on [specific thing]. I am working on [one-line context]. I am stuck on [specific question]. Would you have 15 minutes in the next two weeks, or is there something I should read first?"</p>
<p>Why it works: it proves you read something, it asks one question, and it offers an easy no. Attach nothing on the first message. The CV can come later.</p>
<p>What makes you reply to a cold message?</p>`,
  },
  {
    author: "ananya",
    heading: "From IIITA to Amsterdam: the unglamorous parts",
    channel: "Higher Studies",
    visibility: ALL,
    date: hoursAgo(62),
    text: `<p>People ask about the move to Europe and expect a story about travel. The real story is paperwork, weather and learning to ask questions in a second language.</p>
<p>The professional part was easier than I expected: the technical bar was familiar, and IIITA had prepared me well for hard problems. The hard part was social. In my first months I mistook direct feedback for disapproval, and I stayed quiet in meetings where I should have pushed back.</p>
<p>Two things helped: finding one senior colleague who explained the unwritten rules, and scheduling a weekly question I had to ask in a group setting. Small, deliberate practice.</p>
<p>If you are considering a move abroad, budget energy for the non-technical transition. It is the part nobody puts in the offer letter.</p>`,
  },
  {
    // Deliberately left unanswered (no comments) so the feed has a real open
    // question instead of only resolved threads.
    author: "sathvik",
    heading: "Open question: how do you evaluate retrieval when the corpus changes weekly?",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(9),
    text: `<p>Genuine question for anyone running retrieval systems in production: how do you evaluate a RAG pipeline when the underlying corpus changes every week?</p>
<p>We can measure answer quality on a frozen set, but the documents it was written against are already stale. A rolling set helps, yet the ground truth has to be rewritten almost as often as the index.</p>
<p>What I have tried: a small hand-labelled set per document type, plus weekly spot checks. It catches regressions but not slow drift.</p>
<p>If you have solved this, what does your evaluation loop actually look like? I am especially interested in what you automate and what stays manual.</p>`,
  },
];

const comments = [
  // Production ML checklist
  { post: "The production ML checklist I wish I had at 23", author: "priya", hoursAgo: 5, text: "The data contract point is the one I keep relearning. We had a field silently switch from UTC to local time and spent two days blaming the model." },
  { post: "The production ML checklist I wish I had at 23", author: "sneha", hoursAgo: 4, text: "I would add: write down the cost of a false positive and a false negative before choosing a threshold. The asymmetry usually decides the product design." },
  { post: "The production ML checklist I wish I had at 23", author: "sathvik", hoursAgo: 2, text: "How do you keep the evaluation set fresh without losing comparability? Do you keep two sets permanently?" },
  { post: "The production ML checklist I wish I had at 23", author: "aarav", hoursAgo: 1, text: "Yes, two sets. One frozen for regression, one rolling for reality. The frozen set tells you if you broke something; the rolling set tells you if the world changed." },
  { post: "The production ML checklist I wish I had at 23", author: "ananya", hoursAgo: 1, text: "The rollback point is underrated. We once had a feature flag but no way to undo the writes it had already made. That was a long night." },

  // PM interviews
  { post: "What PM interviews actually test (and what they do not)", author: "kabir", hoursAgo: 12, text: "The 'explain a controversial call' question is excellent. I have started asking it in founder interviews too. It reveals whether someone can hold a decision and its cost at the same time." },
  { post: "What PM interviews actually test (and what they do not)", author: "sathvik", hoursAgo: 10, text: "As a student, this is useful. I have been practising frameworks, but the examples you give are about judgment. Any advice for building that without real product experience?" },
  { post: "What PM interviews actually test (and what they do not)", author: "meera", hoursAgo: 8, text: "Pick one product you use daily and write a one-page decision memo every week: problem, options, trade-off, metric, what would change your mind. After ten weeks you have a portfolio of judgment, not frameworks." },
  { post: "What PM interviews actually test (and what they do not)", author: "dev", hoursAgo: 6, text: "The metric-as-decision-rule framing is the thing I wish more engineers understood too. 'Improved engagement' is not a launch criterion." },

  // Startup story
  { post: "We almost ran out of money building the wrong thing", author: "meera", hoursAgo: 20, text: "The distinction between a design partner and a buyer is the whole game. I have watched teams confuse enthusiasm with budget authority for months." },
  { post: "We almost ran out of money building the wrong thing", author: "aarav", hoursAgo: 18, text: "The second integration as procrastination hit close to home. It feels like progress and it is usually avoidance." },
  { post: "We almost ran out of money building the wrong thing", author: "sathvik", hoursAgo: 15, text: "How did you handle the existing design partners when you cut the roadmap? Did any of them churn?" },
  { post: "We almost ran out of money building the wrong thing", author: "kabir", hoursAgo: 13, text: "Two stayed because the narrower workflow was still useful to them. One left, politely. The honest conversation was better than another quarter of vague feedback." },
  { post: "We almost ran out of money building the wrong thing", author: "neha", hoursAgo: 11, text: "This is a good case study for students who think a startup is mostly product and technology. The hard part is usually the market conversation." },

  // Causal inference
  { post: "Causal inference is not a fancy regression", author: "aarav", hoursAgo: 28, text: "The 'define the estimand' point is where most applied papers lose me. A null average effect can hide a very real subgroup decision." },
  { post: "Causal inference is not a fancy regression", author: "neha", hoursAgo: 26, text: "In HCI we see the same issue with interaction effects. A treatment can help novices and hurt experts, and the average is not a design recommendation." },
  { post: "Causal inference is not a fancy regression", author: "sathvik", hoursAgo: 22, text: "Do you have a favourite introductory resource for DAGs that is practical rather than theoretical?" },
  { post: "Causal inference is not a fancy regression", author: "ananya", hoursAgo: 20, text: "I would start with a short course and then redraw the graph for one real decision you care about. The exercise of naming the arrows is more useful than memorising terminology." },

  // Incident
  { post: "The incident that taught me to stop hero-worshipping uptime", author: "aditya", hoursAgo: 38, text: "Task-level SLOs are the missing piece in so many reliability reviews. A service can be healthy and the workflow can be broken." },
  { post: "The incident that taught me to stop hero-worshipping uptime", author: "riya", hoursAgo: 36, text: "The cultural part is the hardest. Green dashboards are comforting, and it takes courage to say the metric is wrong when every team is hitting it." },
  { post: "The incident that taught me to stop hero-worshipping uptime", author: "sathvik", hoursAgo: 33, text: "How did you get product buy-in for a task-level SLO? It sounds like it requires them to own a number they do not control directly." },
  { post: "The incident that taught me to stop hero-worshipping uptime", author: "rahul", hoursAgo: 31, text: "We started with one workflow and made it a shared target. Product owned the definition, we owned the instrumentation, and we reviewed it together monthly. The shared ownership was the point." },

  // Research collaborator
  { post: "What I look for in a research collaborator", author: "sneha", hoursAgo: 46, text: "Reliability before brilliance is exactly right. The best collaborator I have had sends a short update even when there is nothing exciting to report." },
  { post: "What I look for in a research collaborator", author: "sathvik", hoursAgo: 43, text: "Would you rather receive a polished draft that is late, or an honest rough update on time?" },
  { post: "What I look for in a research collaborator", author: "neha", hoursAgo: 41, text: "Honest rough update, every time. A late polished draft hides the problems until it is expensive to fix them." },
  { post: "What I look for in a research collaborator", author: "ananya", hoursAgo: 39, text: "The 'specific paper' advice is underrated. It takes twenty minutes to read an abstract properly and it changes the entire email." },

  // Quant switch
  { post: "Why I left a comfortable SDE job for quant research", author: "ananya", hoursAgo: 54, text: "The line about confusing a plausible story with evidence is the whole job. I wish more people said it out loud." },
  { post: "Why I left a comfortable SDE job for quant research", author: "aarav", hoursAgo: 52, text: "How did you structure the basics without getting stuck in endless courses? I keep restarting probability." },
  { post: "Why I left a comfortable SDE job for quant research", author: "ishaan", hoursAgo: 50, text: "Problems, not videos. I did a small set of hard problems each week and wrote up every mistake. The write-up was more valuable than the problem." },
  { post: "Why I left a comfortable SDE job for quant research", author: "sathvik", hoursAgo: 47, text: "Did your engineering background help in interviews, or did they only care about math?" },
  { post: "Why I left a comfortable SDE job for quant research", author: "ishaan", hoursAgo: 45, text: "It helped with debugging and implementation rounds, but the core interview was probability and reasoning. I had to build that separately." },

  // Design systems
  { post: "Design systems fail for organisational reasons, not technical ones", author: "dev", hoursAgo: 62, text: "The adoption-by-user-flow point is the one I will steal. Import counts are the vanity metric of design systems." },
  { post: "Design systems fail for organisational reasons, not technical ones", author: "meera", hoursAgo: 60, text: "Governance is product work. Someone has to own the 'no' or the system becomes a suggestion box." },
  { post: "Design systems fail for organisational reasons, not technical ones", author: "sathvik", hoursAgo: 58, text: "How do you handle a team that has a legitimate need the system does not support yet? Saying no too early seems risky." },
  { post: "Design systems fail for organisational reasons, not technical ones", author: "tara", hoursAgo: 56, text: "We gave teams a documented escape hatch with a review date. The rule was not 'never go custom'; it was 'go custom on purpose, and tell us why'." },

  // Paper reading
  { post: "Reading a CV paper in 90 minutes: my actual process", author: "priya", hoursAgo: 70, text: "The five-line summary is the test. I have started doing it in a shared doc and it makes team paper club much more useful." },
  { post: "Reading a CV paper in 90 minutes: my actual process", author: "sathvik", hoursAgo: 67, text: "What do you do when the code is not available? Skip the reproduce step or try to reimplement one small piece?" },
  { post: "Reading a CV paper in 90 minutes: my actual process", author: "sneha", hoursAgo: 65, text: "I try to reimplement one small piece, usually the loss or a single ablation. If that is impossible, I lower my confidence in the result and say so in the five lines." },

  // Evaluation
  { post: "Evaluation is a product problem", author: "aarav", hoursAgo: 78, text: "The museum eval set is exactly what happens when evaluation is owned by the model team alone. It needs a product owner with a refresh cadence." },
  { post: "Evaluation is a product problem", author: "neha", hoursAgo: 76, text: "The annotator committee point applies to HCI studies too. If disagreement is high, the label is the finding, not noise to average away." },
  { post: "Evaluation is a product problem", author: "sathvik", hoursAgo: 73, text: "Do you have a practical way to measure annotation agreement without a stats background?" },
  { post: "Evaluation is a product problem", author: "priya", hoursAgo: 71, text: "Start with a simple agreement table: pick 30 items, have two people label them, and read every disagreement together. You will learn more than from a single coefficient." },

  // Migration
  { post: "The migration postmortem: 7 things that actually mattered", author: "aditya", hoursAgo: 86, text: "Writing the postmortem before launch is a great forcing function. It makes the risks concrete while you can still change the plan." },
  { post: "The migration postmortem: 7 things that actually mattered", author: "rahul", hoursAgo: 84, text: "Telling support before the company is the step most teams skip. They are the ones who hear the customer version first." },
  { post: "The migration postmortem: 7 things that actually mattered", author: "dev", hoursAgo: 82, text: "How did you measure divergence between old and new? Row counts, sampled payloads, or both?" },
  { post: "The migration postmortem: 7 things that actually mattered", author: "riya", hoursAgo: 80, text: "Both, plus a nightly job that diffed a random sample and filed the mismatches as tickets. The sample was small enough to review by hand." },

  // Frontend to platform
  { post: "Frontend to platform engineering: what transferred?", author: "tara", hoursAgo: 94, text: "A good internal API is a UX problem with a compiler. I am going to use that line." },
  { post: "Frontend to platform engineering: what transferred?", author: "rahul", hoursAgo: 92, text: "The 'accept that your user will not read the onboarding guide' lesson took me years. Error messages are documentation." },
  { post: "Frontend to platform engineering: what transferred?", author: "sathvik", hoursAgo: 90, text: "What would you build first if you wanted to demonstrate platform skills without a platform job?" },
  { post: "Frontend to platform engineering: what transferred?", author: "dev", hoursAgo: 88, text: "A small deploy template plus a CLI that another team actually uses. The feedback loop is the point, not the technology." },

  // Kafka
  { post: "Kafka is not a queue (and that matters)", author: "riya", hoursAgo: 102, text: "The hot partition point is real. We had one key with a disproportionate share of traffic and the aggregate lag looked fine for weeks." },
  { post: "Kafka is not a queue (and that matters)", author: "rahul", hoursAgo: 100, text: "Retry topics with backoff saved us during a downstream outage. In-place retries turned one slow dependency into a stalled partition." },
  { post: "Kafka is not a queue (and that matters)", author: "sathvik", hoursAgo: 98, text: "Is there a simple rule for choosing a partition key when you are not sure about the access pattern?" },
  { post: "Kafka is not a queue (and that matters)", author: "aditya", hoursAgo: 96, text: "Start with the entity you need ordering for, then check the cardinality and skew. If the key has a few dominant values, you have a hot partition waiting." },

  // Interview script
  { post: "A 30-minute user interview script for alumni founders", author: "kabir", hoursAgo: 110, text: "The 'last time' question is the best filter. It turns opinions into a concrete story within the first minute." },
  { post: "A 30-minute user interview script for alumni founders", author: "neha", hoursAgo: 108, text: "This is basically good qualitative research practice. The only thing I would add is recording (with consent) so you can check what you missed." },
  { post: "A 30-minute user interview script for alumni founders", author: "sathvik", hoursAgo: 105, text: "How many interviews before you feel confident enough to build something?" },
  { post: "A 30-minute user interview script for alumni founders", author: "meera", hoursAgo: 103, text: "For a narrow workflow, five to eight good interviews often show a pattern. The goal is not statistical significance; it is a clear enough problem to test." },

  // Runbooks
  { post: "Runbooks rot. Here is how we keep ours alive", author: "aditya", hoursAgo: 118, text: "Testing one runbook per rotation is such a simple fix. We do something similar for on-call handoffs and it has caught several stale steps." },
  { post: "Runbooks rot. Here is how we keep ours alive", author: "riya", hoursAgo: 116, text: "The ownership and review date are key. A runbook without an owner is a museum exhibit." },
  { post: "Runbooks rot. Here is how we keep ours alive", author: "sathvik", hoursAgo: 114, text: "Do you keep runbooks in the repo or in the wiki? We keep arguing about this." },
  { post: "Runbooks rot. Here is how we keep ours alive", author: "rahul", hoursAgo: 112, text: "Repo, next to the service, reviewed like code. The wiki is where runbooks go to be forgotten." },

  // Dashboards
  { post: "Three questions before you trust a dashboard", author: "priya", hoursAgo: 126, text: "The denominator question explains most of the metric disagreements I have seen. Two teams can be technically correct and measuring different populations." },
  { post: "Three questions before you trust a dashboard", author: "meera", hoursAgo: 124, text: "I would add: who can change this metric, and do they know they can? A dashboard without an owner is entertainment." },
  { post: "Three questions before you trust a dashboard", author: "sathvik", hoursAgo: 122, text: "What is the most common instrumentation change that causes a false alarm?" },
  { post: "Three questions before you trust a dashboard", author: "ananya", hoursAgo: 120, text: "A timezone or date-boundary change is the classic. The second most common is a bot filter being added or removed without anyone updating the definition." },

  // Hiring
  { post: "Hiring your first engineer: signals over pedigree", author: "meera", hoursAgo: 134, text: "The reference check about the worst week is the one I always forget to ask. It is much more informative than the highlight reel." },
  { post: "Hiring your first engineer: signals over pedigree", author: "neha", hoursAgo: 132, text: "Kind under pressure is underrated. In a small team, one person who panics badly can change the whole culture." },
  { post: "Hiring your first engineer: signals over pedigree", author: "sathvik", hoursAgo: 130, text: "How do you test 'asks about the business' without making it feel like a trick question?" },
  { post: "Hiring your first engineer: signals over pedigree", author: "kabir", hoursAgo: 128, text: "I just leave space for questions and see what they ask. The ones who care about the business will use it." },

  // Email a professor
  { post: "How to email a professor (without sounding like a template)", author: "sneha", hoursAgo: 142, text: "One PDF, not five. I once received a 40 MB portfolio in a first email. Please do not." },
  { post: "How to email a professor (without sounding like a template)", author: "ananya", hoursAgo: 140, text: "The 'make it easy to say no' framing is useful for cold outreach in industry too. It lowers the cost of a reply." },
  { post: "How to email a professor (without sounding like a template)", author: "sathvik", hoursAgo: 138, text: "Is it okay to mention a specific project I built even if it is not research?" },
  { post: "How to email a professor (without sounding like a template)", author: "neha", hoursAgo: 136, text: "Absolutely, if you can connect it to a question. A project is evidence of how you think; just do not paste the whole README." },

  // Short takes
  { post: "Hot take: most ML infrastructure problems are data contract problems", author: "priya", hoursAgo: 2, text: "The number of times a 'model regression' was a schema change is not small. Loud validation saves so much time." },
  { post: "Hot take: most ML infrastructure problems are data contract problems", author: "sathvik", hoursAgo: 1, text: "What does loud validation look like in practice? A failing job, an alert, or a quarantine table?" },
  { post: "Hot take: most ML infrastructure problems are data contract problems", author: "aarav", hoursAgo: 1, text: "All three, at different layers. The job fails for structural breaks, the alert fires for drift, and the quarantine table keeps the bad rows for debugging." },

  { post: "The best interview habit I have seen", author: "meera", hoursAgo: 7, text: "I have started saying 'my assumption is...' explicitly in product interviews too. It makes the conversation collaborative instead of performative." },
  { post: "The best interview habit I have seen", author: "sathvik", hoursAgo: 5, text: "This is so simple and so hard to remember under pressure." },

  { post: "Accessibility is not a phase", author: "dev", hoursAgo: 16, text: "If it is not in the definition of done, it is a wish. Same for performance and security." },
  { post: "Accessibility is not a phase", author: "neha", hoursAgo: 14, text: "Exactly. Values that do not change the release checklist are decoration." },

  { post: "Looking for one alumnus who has shipped a real recommender", author: "priya", hoursAgo: 24, text: "Happy to talk. I have shipped a ranking system for a content feed; the cold-start and diversity trade-offs are the interesting part. Send me a note." },
  { post: "Looking for one alumnus who has shipped a real recommender", author: "aarav", hoursAgo: 22, text: "Seconding Priya. Also ask her about the evaluation set that made the team realise the offline metric was lying." },
  { post: "Looking for one alumnus who has shipped a real recommender", author: "sathvik", hoursAgo: 20, text: "Thank you both. I will send a short list of questions rather than a vague 'pick your brain' message." },

  { post: "If your eval set and your model share an author...", author: "sneha", hoursAgo: 34, text: "The same applies to benchmark papers. A benchmark designed by the method's authors is a useful demo, not an independent result." },
  { post: "If your eval set and your model share an author...", author: "aarav", hoursAgo: 32, text: "The hardest examples are usually the ones the model team did not think to include. Get an outsider to write them." },

  { post: "Read the figures before the introduction", author: "priya", hoursAgo: 44, text: "And read the axes. I have been fooled by a truncated y-axis more than once." },
  { post: "Read the figures before the introduction", author: "sathvik", hoursAgo: 42, text: "This is going to save me a lot of time in paper club." },

  { post: "A cold DM template that actually gets replies", author: "kabir", hoursAgo: 52, text: "The 'easy no' is the part people miss. Making it easy to decline increases the chance of a real yes later." },
  { post: "A cold DM template that actually gets replies", author: "meera", hoursAgo: 50, text: "Short, specific, one ask. I would add: do not attach a calendar link on the first message. It feels presumptuous." },

  { post: "From IIITA to Amsterdam: the unglamorous parts", author: "neha", hoursAgo: 60, text: "The social transition is real. I advise students to budget for it the same way they budget for the technical work." },
  { post: "From IIITA to Amsterdam: the unglamorous parts", author: "sathvik", hoursAgo: 58, text: "Did the direct feedback culture get easier with time, or did you have to change how you responded?" },
  { post: "From IIITA to Amsterdam: the unglamorous parts", author: "ananya", hoursAgo: 56, text: "Both. I stopped hearing 'this is wrong' as 'you are wrong', and I learned to ask 'what would make this stronger?' instead of defending the first draft." },
];

// Engagement is generated from this map to keep the seed readable.
const likeMap = {
  "The production ML checklist I wish I had at 23": ["priya", "sneha", "sathvik", "riya", "ananya", "dev"],
  "What PM interviews actually test (and what they do not)": ["kabir", "sathvik", "dev", "meera"],
  "We almost ran out of money building the wrong thing": ["meera", "aarav", "sathvik", "neha", "riya"],
  "Causal inference is not a fancy regression": ["aarav", "neha", "sathvik", "priya"],
  "The incident that taught me to stop hero-worshipping uptime": ["aditya", "riya", "sathvik", "dev"],
  "What I look for in a research collaborator": ["sneha", "sathvik", "ananya", "neha"],
  "Why I left a comfortable SDE job for quant research": ["ananya", "aarav", "sathvik", "priya"],
  "Design systems fail for organisational reasons, not technical ones": ["dev", "meera", "sathvik", "tara"],
  "Reading a CV paper in 90 minutes: my actual process": ["priya", "sathvik", "aarav"],
  "Evaluation is a product problem": ["aarav", "neha", "sathvik", "sneha"],
  "The migration postmortem: 7 things that actually mattered": ["aditya", "rahul", "dev", "aarav"],
  "Frontend to platform engineering: what transferred?": ["tara", "rahul", "sathvik", "dev"],
  "Kafka is not a queue (and that matters)": ["riya", "rahul", "sathvik"],
  "A 30-minute user interview script for alumni founders": ["kabir", "neha", "sathvik"],
  "Runbooks rot. Here is how we keep ours alive": ["aditya", "riya", "sathvik"],
  "Three questions before you trust a dashboard": ["priya", "meera", "sathvik"],
  "Hiring your first engineer: signals over pedigree": ["meera", "neha", "sathvik"],
  "How to email a professor (without sounding like a template)": ["sneha", "ananya", "sathvik"],
  "Hot take: most ML infrastructure problems are data contract problems": ["priya", "sathvik", "ishaan"],
  "The best interview habit I have seen": ["meera", "sathvik", "tara"],
  "Accessibility is not a phase": ["dev", "neha", "meera"],
  "Looking for one alumnus who has shipped a real recommender": ["priya", "aarav", "meera"],
  "If your eval set and your model share an author...": ["sneha", "aarav", "ananya"],
  "Read the figures before the introduction": ["priya", "sathvik"],
  "A cold DM template that actually gets replies": ["kabir", "meera", "sathvik"],
  "From IIITA to Amsterdam: the unglamorous parts": ["neha", "sathvik", "meera"],
  "Open question: how do you evaluate retrieval when the corpus changes weekly?": ["priya", "aarav", "meera"],
};

const likes = Object.entries(likeMap).flatMap(([post, authors]) =>
  authors.map((author) => ({ post, author }))
);

const follows = {
  sathvik: [
    "aarav", "college", "sneha", "meera", "kabir", "ananya",
    "rahul", "priya", "ishaan", "tara", "neha",
  ],
  aarav: ["priya", "sneha", "meera"],
  priya: ["aarav", "sneha", "ananya"],
  meera: ["kabir", "aarav"],
  kabir: ["meera", "aarav"],
  ananya: ["sneha", "neha"],
  rahul: ["aditya", "riya"],
  tara: ["dev", "meera"],
};

module.exports = { users, channels, posts, comments, likes, follows };
