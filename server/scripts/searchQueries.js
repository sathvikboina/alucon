/*
 * Relevance fixture for the unified search index.
 *
 * Each query names the record a member should see in the top 10. Titles match
 * the seeded demo data so the metric is reproducible after `npm run seed`.
 */
module.exports = [
  // Jobs
  { query: "applied machine learning internship", type: "job", title: "Applied ML Systems Intern" },
  { query: "backend engineering internship hyderabad", type: "job", title: "Backend Engineering Intern" },
  { query: "computer vision research assistant", type: "job", title: "Computer Vision Research Assistant" },
  { query: "backend internship referral window", type: "job", title: "Backend Internship Referral Window" },
  { query: "production ML project remote", type: "job", title: "Production ML Project" },

  // Alumni
  { query: "alumni working at Google", type: "alumni", title: "Nikhil Sethi" },
  { query: "quant researcher meridian quant", type: "alumni", title: "Ishaan Kulkarni" },
  { query: "staff product designer design systems", type: "alumni", title: "Tara Singh" },
  { query: "computer vision research scientist austin", type: "alumni", title: "Sneha Malhotra" },
  { query: "site reliability engineer meridian cloud", type: "alumni", title: "Rahul Nair" },

  // Posts
  { query: "production ML checklist", type: "post", title: "The production ML checklist I wish I had at 23" },
  { query: "evaluate retrieval when the corpus changes", type: "post", title: "Open question: how do you evaluate retrieval when the corpus changes weekly?" },
  { query: "cold DM template that gets replies", type: "post", title: "A cold DM template that actually gets replies" },
  { query: "left SDE job for quant research", type: "post", title: "Why I left a comfortable SDE job for quant research" },
  { query: "distributed systems migration", type: "post", title: "Shipped our distributed-systems migration" },

  // Resources
  { query: "hidden technical debt machine learning", type: "resource", title: "Hidden Technical Debt in Machine Learning Systems" },
  { query: "BGE text embeddings paper", type: "resource", title: "C-Pack: BGE Text Embeddings" },
  { query: "attention transformer paper", type: "resource", title: "Attention Is All You Need" },
  { query: "BERT pretraining transformers", type: "resource", title: "BERT: Pre-training of Deep Bidirectional Transformers" },

  // Events
  { query: "systems alumni meet", type: "event", title: "Systems Alumni Meet" },
  { query: "research roundtable event", type: "event", title: "IIITA Research Roundtable" },
  { query: "career Q&A with alumni", type: "event", title: "Career Q&A with Alumni" },

  // Groups
  { query: "class of 2024 batch group", type: "group", title: "Class of 2024" },
  { query: "competitive programming society", type: "group", title: "Competitive Programming Society" },
  { query: "bay area alumni chapter", type: "group", title: "Bay Area Alumni Chapter" },

  // Extended set: named people, companies, locations and phrase variants.
  { query: "nimbus labs spring internship", type: "job", title: "Nimbus Labs spring internship window" },
  { query: "arclight backend hiring", type: "job", title: "Arclight Systems backend hiring window" },
  { query: "arclight winter referrals closed", type: "job", title: "Arclight Systems winter referrals closed" },
  { query: "backend engineering internship onsite hyderabad", type: "job", title: "Backend Engineering Intern" },
  { query: "referral window two backend internship slots", type: "job", title: "Backend Internship Referral Window" },

  { query: "machine learning engineer nimbus labs bengaluru", type: "alumni", title: "Priya Rao" },
  { query: "product manager tessellate", type: "alumni", title: "Meera Iyer" },
  { query: "data scientist northwind health amsterdam", type: "alumni", title: "Ananya Verma" },
  { query: "staff product designer kite compass berlin", type: "alumni", title: "Tara Singh" },
  { query: "quant researcher meridian quant mumbai", type: "alumni", title: "Ishaan Kulkarni" },
  { query: "site reliability engineer meridian cloud singapore", type: "alumni", title: "Rahul Nair" },
  { query: "founder cto ledgerloop", type: "alumni", title: "Kabir Shah" },
  { query: "faculty human computer interaction iiit allahabad", type: "alumni", title: "Dr. Neha Bansal" },
  { query: "backend engineer arclight systems hyderabad", type: "alumni", title: "Riya Kapoor" },
  { query: "senior software engineer google mountain view", type: "alumni", title: "Nikhil Sethi" },
  { query: "student at iiit allahabad", type: "alumni", title: "Sathvik Boina" },

  { query: "outreach message that gets replies", type: "post", title: "A cold DM template that actually gets replies" },
  { query: "data quality contracts in ml infrastructure", type: "post", title: "Hot take: most ML infrastructure problems are data contract problems" },
  { query: "best interview habit", type: "post", title: "The best interview habit I have seen" },
  { query: "accessibility is not a phase", type: "post", title: "Accessibility is not a phase" },
  { query: "migration postmortem", type: "post", title: "The migration postmortem: 7 things that actually mattered" },
  { query: "evaluation is a product problem", type: "post", title: "Evaluation is a product problem" },
  { query: "kafka is not a queue", type: "post", title: "Kafka is not a queue (and that matters)" },
  { query: "email a professor template", type: "post", title: "How to email a professor (without sounding like a template)" },
  { query: "hiring first employee signals", type: "post", title: "Hiring your first engineer: signals over pedigree" },
  { query: "trust a dashboard", type: "post", title: "Three questions before you trust a dashboard" },
  { query: "maintaining operational runbooks", type: "post", title: "Runbooks rot. Here is how we keep ours alive" },
  { query: "student alumni mentoring cohort", type: "post", title: "September student-alumni mentoring cohort" },
  { query: "frontend to platform engineering", type: "post", title: "Frontend to platform engineering: what transferred?" },
  { query: "vision conference slides", type: "post", title: "Efficient vision systems: recording and slides" },
  { query: "coursework to first internship", type: "post", title: "From coursework to a strong first internship" },
  { query: "what pm interviews test", type: "post", title: "What PM interviews actually test (and what they do not)" },
  { query: "distributed systems migration shipped", type: "post", title: "Shipped our distributed-systems migration" },
  { query: "startup almost ran out of money", type: "post", title: "We almost ran out of money building the wrong thing" },
  { query: "design systems organisational reasons", type: "post", title: "Design systems fail for organisational reasons, not technical ones" },
  { query: "reading a cv paper in 90 minutes", type: "post", title: "Reading a CV paper in 90 minutes: my actual process" },
  { query: "incident taught me about uptime", type: "post", title: "The incident that taught me to stop hero-worshipping uptime" },
  { query: "professor outreach email", type: "post", title: "How to email a professor (without sounding like a template)" },
  { query: "master's abroad experience amsterdam", type: "post", title: "From IIITA to Amsterdam: the unglamorous parts" },

  { query: "product internship cohort 2026", type: "group", title: "Product Internship Cohort 2026" },
  { query: "research and higher studies circle", type: "group", title: "Research & Higher Studies Circle" },
  { query: "class of 2023 alumni", type: "group", title: "Class of 2023 Alumni" },
];
