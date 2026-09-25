# Innovation OS — UX Information Architecture

## 1. UX North Star
Every project screen must help the innovator answer:
1. أين أنا؟
2. ماذا نعرف؟
3. ماذا لا نعرف؟
4. ماذا أفعل الآن؟

The product must feel like an innovation operating system, not an administrative dashboard and not a generic chatbot.

## 2. Global Principles
- Arabic-first RTL; English native LTR.
- Mixed scientific Arabic/English content must remain visually stable.
- Progressive disclosure.
- One primary action per state where possible.
- Never display fake scores for innovation quality.
- Never fabricate evidence during loading/error/no-result states.
- AI recommendations must expose rationale.

## 3. Public Flow
### Landing
Goal: first useful interaction with minimal friction.

Primary elements:
- brand / concise value proposition
- large free-text idea/problem input
- examples
- CTA: افحص الفكرة
- secondary CTA: استكشف كيف تعمل المنصة

No sign-in wall before initial Idea X-Ray.

States:
- default
- typing
- validating input
- submitting
- recoverable error

### Idea X-Ray Result
Sections:
- Problem
- Context
- Target Beneficiary
- Assumptions
- Unknowns
- Risks
- Critical Questions
- Suggested Search Directions
- Next Best Action

Primary CTA: ابدأ مشروعك

Explicitly avoid:
- “فكرتك ممتازة”
- arbitrary numerical innovation score

### Auth Transition
Preserve anonymous X-Ray payload across account creation/login and convert it into a project after successful authentication.

## 4. Authenticated Top-Level IA
- My Innovations
- Account Settings

No social feed, marketplace, course catalog, school admin, or competition navigation.

## 5. My Innovations
Card contents only:
- project title
- status
- current stage
- next best action
- last activity
- critical risk if present

Primary actions:
- resume project
- start new idea

Empty state:
“لم تبدأ مشروع ابتكار بعد.”
CTA: ابدأ بفكرتك

## 6. Project Workspace Shell
Desktop:
- left project navigation
- center work area
- right intelligence panel

Mobile:
- project navigation collapses to drawer/tab switcher
- intelligence panel becomes a bottom sheet / dedicated contextual view
- primary action remains visible

### Left navigation
- Overview
- Evidence
- Prior Art
- Gap
- Experiments
- Files
- Timeline

### Right Intelligence Panel
Always project-contextual:
- Current State
- Biggest Unknown
- Current Risk
- Next Best Action
- Why this action?
- Ask My Project

## 7. Overview
Sections:
- project title
- problem statement
- affected user
- context
- current hypothesis
- proposed solution direction
- current stage
- readiness descriptor
- open questions
- latest decision
- next action

Do not turn this page into KPI cards.

## 8. Evidence Workspace
Primary mental model: “What do we need to prove?”

Tabs/sections:
- Evidence Board
- Search Evidence
- Saved Sources
- Claims

Evidence Board columns/groups:
- Supported
- Mixed
- Unsupported
- Unknown

Search Evidence flow:
1. choose purpose: Problem Evidence / Scientific Mechanism / Technology Evidence / Measurement Method
2. choose/confirm question or claim
3. system shows expanded query concepts
4. async research starts
5. progress state
6. normalized results
7. save source
8. optionally link to claim as Supports / Challenges / Context

No-results state must suggest narrowing/broadening the question, never fabricate sources.

## 9. Prior Art Workspace
Goal: discover existing approaches and understand relevance.

Result item:
- title
- source type
- date
- identifier
- technical summary
- conceptual similarity: Low / Medium / High
- shared concepts
- key differences
- source link

Persistent disclaimer:
Exploratory discovery, not a patentability/novelty legal opinion.

Comparison view focuses on concepts and differences, not legal conclusions.

## 10. Gap Workspace
Prerequisite gate if context is insufficient.

When eligible:
- Known Approaches
- Known Limitations
- Constraints
- Potential Gap Hypotheses

Gap card:
- title
- description
- gap type
- linked evidence
- related prior art
- assumptions
- status (default UNVALIDATED)
- confidence with explanation, not decorative score

Primary action: Validate / use gap for experiment design.

## 11. Experiment Workspace
Wizard/progressive form rather than one dense scientific form.

Steps:
1. Research Question
2. Hypothesis
3. Variables
4. Control
5. Measurement
6. Sample
7. Protocol
8. Success Criteria
9. Failure Modes
10. Safety / Ethics

Actions:
- save draft
- run scientific critique

Critic result groups:
- blocking issues
- important revisions
- suggestions

Status may not become READY while blocking issues remain.

## 12. Ask My Project
Contextual interaction, not global generic chat.

Suggested prompts:
- ماذا أثبتنا حتى الآن؟
- ما أكبر نقطة ضعف؟
- ما الادعاءات غير المدعومة؟
- لماذا هذه الخطوة التالية؟
- ما أهم شيء أبحث عنه الآن؟

Response UI visually distinguishes:
- Fact
- Inference
- Recommendation

Where evidence is used, show source references.

## 13. Timeline
Append-oriented project history.

Event examples:
- Project Created
- Problem Updated
- Evidence Saved
- Prior Art Added
- Gap Created
- Experiment Revised
- AI Recommendation Changed
- Decision Recorded

Filters may be added only if event volume justifies it.

## 14. Files
Support:
- PDF
- CSV
- XLSX
- images
- text

Upload states:
- selecting
- validating
- uploading
- processing/indexing
- ready
- rejected format
- failed processing

Explain data classification and privacy.

## 15. Account Settings
MVP:
- display name
- preferred language
- country
- privacy/AI data disclosure
- sign out

No organization admin UI in MVP.

## 16. System States
### Loading
Prefer skeletons for page data; explicit progress for long research/AI jobs.

### Empty
Every empty state explains the missing step and includes one actionable CTA.

### Error
Must say:
- what failed
- what was preserved
- whether retry is safe
- next action

### Success
Confirm meaningful project progress, not generic confetti.

## 17. Accessibility
- keyboard navigation
- visible focus
- semantic landmarks/headings
- screen reader labels
- logical RTL focus/order
- minimum contrast AA target
- motion reduced when user prefers reduced motion

## 18. MVP User Flows
### Flow A
Landing -> X-Ray -> Auth -> Project Created -> Overview

### Flow B
Project -> Evidence Search -> Results -> Save Source -> Link Claim -> Brain Update

### Flow C
Project -> Prior Art Search -> Review Candidate -> Save -> Compare -> Brain Update

### Flow D
Evidence + Prior Art -> Generate Gaps -> Select Gap -> mark UNVALIDATED -> validation questions

### Flow E
Gap -> Experiment Draft -> Critic -> Needs Revision -> Edit -> Critic -> Ready

### Flow F
Any Project Context -> Ask My Project -> grounded response with Fact/Inference/Recommendation