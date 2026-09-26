# Epic 10 — Ask My Project

## Objective
Answer project-specific questions from structured Project Context rather than chat history.

## Core rule
Ask My Project is not a generic chatbot.

Each request:
1. detects intent,
2. builds a bounded Context Pack,
3. calls the Ask Project agent,
4. validates grounding,
5. returns FACT / INFERENCE / RECOMMENDATION / UNCERTAINTY.

## Context routing
Intent classes:
- GENERAL
- EVIDENCE
- PRIOR_ART
- GAP
- EXPERIMENT

The context builder fetches only the relevant domain data needed for the question rather than loading the entire project.

## Grounding
Facts have two grounding modes:
- PROJECT_DATA
- SOURCE_GROUNDED

Scientific factual claims marked SOURCE_GROUNDED must contain source_ids that were actually present in the authorized Context Pack.

The API removes unknown source IDs. If a SOURCE_GROUNDED fact has no valid source IDs after validation, that fact is dropped.

## Source rendering
The response includes only the authorized source catalog:
- source id
- title
- DOI
- canonical URL

The UI renders source links alongside grounded facts.

## Privacy and storage
No chat-history table is created.
The current question/answer is transient in the UI.

For observability, server-only AI telemetry may write:
- ai_runs agent_type ASK_PROJECT
- ai_artifacts artifact_type ASK_PROJECT_ANSWER

The artifact records question, intent, and structured answer for audit/cost analysis. It is protected by existing workspace/project RLS.

## Model
Default:
OPENAI_ASK_PROJECT_MODEL=gpt-5.6-terra

## Failure behavior
If the model/provider fails, no fallback answer is fabricated.
The user is told the Project Context answer could not be completed.

## API
POST /api/v1/projects/:id/ask

Input:
- question

Output:
- intent
- structured answer
- authorized source catalog

## UX
Ask My Project is embedded contextually in the Project Brain side panel and includes common prompts:
- ماذا أثبتنا حتى الآن؟
- ما أكبر نقطة ضعف في المشروع؟
- ما الادعاءات التي ما زالت بلا دليل؟
- ما أهم شيء يجب أن أفعله الآن ولماذا؟
