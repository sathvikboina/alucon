process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  rankInternships,
  rankMentors,
  skillsMatch,
  requirementsFor,
} = require("../services/matching");

const now = Date.now();
const days = (count) => new Date(now + count * 24 * 60 * 60 * 1000);

const student = {
  _id: "student-1",
  name: "Test Student",
  role: "student",
  program: "B.Tech IT",
  working_area: "Machine Learning",
  skills: ["Python", "Machine Learning", "NLP", "SQL"],
  mentee_goals: ["Career", "Placements"],
  internship_preferences: {
    types: ["Internship"],
    work_modes: ["Remote", "Hybrid"],
    locations: ["Bengaluru", "Remote"],
  },
};

const jobs = [
  {
    _id: "job-ml",
    userID: "alumni-1",
    created_by_user: "ML Mentor",
    Job_name: "Applied ML Intern",
    Description: "Work on NLP evaluation and production machine learning with Python.",
    skills: ["Python", "Machine Learning", "NLP"],
    job_type: "Internship",
    work_mode: "Hybrid",
    location: "Bengaluru, India",
    Job_deadline: days(10),
    Job_post_date: days(-2),
  },
  {
    _id: "job-cv",
    userID: "alumni-2",
    created_by_user: "Vision Mentor",
    Job_name: "Computer Vision Research Assistant",
    Description: "PyTorch, computer vision and deep learning research.",
    skills: ["Computer Vision", "PyTorch", "Deep Learning"],
    job_type: "Research",
    work_mode: "Onsite",
    location: "Austin, USA",
    Job_deadline: days(20),
    Job_post_date: days(-20),
  },
];

const posters = {
  "alumni-1": { _id: "alumni-1", role: "alumni" },
  "alumni-2": { _id: "alumni-2", role: "alumni" },
};

test("skill aliases match common variants", () => {
  assert.equal(skillsMatch("ML", "Machine Learning"), true);
  assert.equal(skillsMatch("Node.js", "Node"), true);
  assert.equal(skillsMatch("Python", "Computer Vision"), false);
});

test("requirement extraction de-duplicates aliases", () => {
  const requirements = requirementsFor({
    Job_name: "ML intern",
    Description: "Python and machine learning; ML fundamentals.",
    skills: ["Python", "ML", "Machine Learning"],
  });
  assert.deepEqual(requirements, ["Python", "ML"]);
});

test("an ML internship outranks an unrelated vision role", () => {
  const ranked = rankInternships(student, jobs, { posters });
  assert.equal(ranked[0].id, "job-ml");
  assert.ok(ranked[0].score > ranked[1].score);
  assert.ok(ranked[0].matchedSkills.includes("Python"));
  assert.ok(ranked[0].reasons.length > 0);
});

test("program eligibility is a hard constraint", () => {
  const restricted = {
    ...jobs[0],
    _id: "job-ece",
    eligible_programs: ["B.Tech ECE"],
  };
  const ranked = rankInternships(student, [restricted], { posters });
  assert.equal(ranked.length, 0);
});

test("mentor ranking uses skills, availability and capacity", () => {
  const people = [
    {
      _id: "mentor-good",
      name: "Good Mentor",
      role: "alumni",
      program: "B.Tech IT",
      organisation: "Nimbus",
      working_area: "Machine Learning",
      skills: ["Python", "Machine Learning"],
      mentorship: { available: true, areas: ["Career"], capacity: 2 },
    },
    {
      _id: "mentor-unavailable",
      name: "Unavailable Mentor",
      role: "alumni",
      program: "B.Tech IT",
      working_area: "Machine Learning",
      skills: ["Python"],
      mentorship: { available: false, areas: ["Career"], capacity: 2 },
    },
    {
      _id: "mentor-full",
      name: "Full Mentor",
      role: "alumni",
      program: "B.Tech IT",
      working_area: "Machine Learning",
      skills: ["Python"],
      mentorship: { available: true, areas: ["Career"], capacity: 1 },
    },
  ];

  const requests = [
    {
      requestedBy: "student-1",
      requestedTo: "mentor-full",
      status: "active",
    },
  ];

  const ranked = rankMentors(student, people, {
    area: "Career",
    requests,
  });

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, "mentor-good");
  assert.ok(ranked[0].reasons.some((reason) => reason.includes("shared skill")));
});

test("an existing open request removes the mentor from suggestions", () => {
  const people = [
    {
      _id: "mentor-good",
      name: "Good Mentor",
      role: "alumni",
      working_area: "Machine Learning",
      skills: ["Python"],
      mentorship: { available: true, areas: ["Career"], capacity: 2 },
    },
  ];
  const ranked = rankMentors(student, people, {
    area: "Career",
    requests: [
      {
        requestedBy: "student-1",
        requestedTo: "mentor-good",
        status: "pending",
      },
    ],
  });
  assert.equal(ranked.length, 0);
});

test("preference skills are not counted as evidence", () => {
  const preferenceOnly = {
    ...student,
    skills: ["SQL"],
    internship_preferences: {
      ...student.internship_preferences,
      skills: ["Python", "Machine Learning"],
    },
  };
  const ranked = rankInternships(preferenceOnly, [jobs[0]], { posters });
  assert.equal(ranked.length, 1);
  assert.ok(!ranked[0].matchedSkills.includes("Python"));
  assert.ok(ranked[0].missingSkills.includes("Python"));
});

test("mentors must explicitly opt in", () => {
  const people = [
    {
      _id: "mentor-legacy",
      name: "Legacy Mentor",
      role: "alumni",
      working_area: "Machine Learning",
      skills: ["Python"],
    },
    {
      _id: "mentor-partial",
      name: "Partial Mentor",
      role: "alumni",
      working_area: "Machine Learning",
      skills: ["Python"],
      mentorship: { areas: ["Career"], capacity: 2 },
    },
  ];
  const ranked = rankMentors(student, people, { area: "Career" });
  assert.equal(ranked.length, 0);
});
