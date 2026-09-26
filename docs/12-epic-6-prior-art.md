# Epic 6 — Prior-Art Discovery

## Objective
Discover and compare relevant prior work without issuing patentability, novelty, freedom-to-operate, infringement, or other legal opinions.

## Providers
### Research
OpenAlex is the primary research-paper discovery provider.

### Patents
EPO Open Patent Services (OPS) is the patent provider adapter.

OPS is an official EPO REST service backed by the same patent data sources used by Espacenet and the European Patent Register.

Required runtime secrets:
- EPO_OPS_CONSUMER_KEY
- EPO_OPS_CONSUMER_SECRET

OAuth token endpoint:
https://ops.epo.org/3.2/auth/accesstoken

Published-data search:
https://ops.epo.org/3.2/rest-services/published-data/search

When credentials are absent, research-paper discovery remains available and the UI explicitly marks patent search unavailable. No patent results are fabricated.

## Comparison
Each saved Prior-Art item may include:
- technical summary
- conceptual similarity: LOW / MEDIUM / HIGH
- similarity reasons
- shared concepts
- key differences
- limitations
- explicit legal disclaimer

Comparison uses only supplied project context and candidate metadata.

## Data model
- prior_art_items
- sources
- project_sources

Prior-Art items remain linked to canonical Source records.

## Security
- RLS enabled
- SECURITY INVOKER save workflow
- workspace/project ownership checks
- explicit grants
- no anonymous access
- AI cannot issue legal patentability verdicts

## Staging validation
Synthetic project:
- prior_art_items: 1
- linked project_sources: 1
- PRIOR_ART_SAVED events: 1

Cross-tenant user B:
- visible prior_art_items: 0
- visible project_sources: 0

Synthetic data was deleted.

## Product behavior
Prior-Art workspace now supports:
- research search
- optional patent search through EPO OPS
- source opening
- AI concept comparison
- save to project
- Shared Concepts
- Key Differences
- conceptual similarity labels
