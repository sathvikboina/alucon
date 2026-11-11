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
];
