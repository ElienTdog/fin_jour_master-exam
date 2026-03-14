---
name: lark-weekly-question-sop
description: Generate weekly English thinking questions from Feishu Bitable article records and write them into a question bank table with deduplication and observability. Use when building or operating a Monday-scheduled A-to-B SOP for teaching teams: filter previous-week articles, fetch original doc content, generate title/question/answer outline, and upsert records safely.
---

# Lark Weekly Question Sop

Implement a two-stage teaching operations pipeline:
- Phase 1: Weekly question generation (A -> B)
- Phase 2: Daily article ingest (external feeds -> A)

## Workflow

1. Configure feed sources from [references/ingest-config.example.json](references/ingest-config.example.json).
2. Run daily ingest (`scripts/daily_article_ingest.py`) to write fresh links into table A.
3. Run weekly question pipeline (`scripts/run_weekly_pipeline.py`) to produce question records in table B.
4. Verify summary logs and keep dry-run enabled before production writes.

## Run Phase 1 (A -> B)

```bash
python scripts/run_weekly_pipeline.py \
  --app-token Pyddb4ZISahwSXsdzOrcaaljnQg \
  --table-a tblJtP7hMKzCrhGT \
  --table-b tblH8zlAGAc1hiN2 \
  --timezone Asia/Shanghai \
  --window previous_week \
  --dry-run true
```

Switch `--dry-run` to `false` for real writes.

## Run Phase 2 (Feeds -> A)

```bash
python scripts/daily_article_ingest.py \
  --app-token Pyddb4ZISahwSXsdzOrcaaljnQg \
  --table-a tblJtP7hMKzCrhGT \
  --timezone Asia/Shanghai \
  --sources-file references/ingest-config.example.json \
  --dry-run true
```

Switch `--dry-run` to `false` for real writes.

## Inputs

Set environment variables before running:

```bash
FEISHU_APP_ID=...
FEISHU_APP_SECRET=...
OPENAI_API_KEY=...                # Optional; script falls back to heuristic generation if missing
OPENAI_MODEL=gpt-4o-mini          # Optional
ARTICLE_SOURCES_JSON=[...]        # Optional alternative to --sources-file
```

## Behaviors Locked By This Skill

- Use previous natural week window (Monday to Sunday) in `Asia/Shanghai` unless overridden.
- Generate one English question per article.
- Default `发布状态` to `未发布`.
- Map `题目编号 = zfill(4, primarykey)`.
- Skip records already present in B by `题目编号`.
- Daily ingest deduplicates by normalized `article_url`.
- Daily ingest allocates next `primarykey` as `max(existing primarykey) + 1`.
- Retry once on generation and write errors.

## Resources

### scripts/
- `run_weekly_pipeline.py`: Full pipeline runner (A read -> doc fetch -> generation -> B write).
- `daily_article_ingest.py`: Daily feed collector (RSS/Atom -> A table).

### references/
- `field-mapping.md`: Source/target field and type mapping.
- `prompt-template.md`: Deterministic generation prompt contract.
- `scheduler-examples.md`: GitHub Actions and Windows Task Scheduler templates.
- `ingest-config.example.json`: Example source feed list for daily ingest.

## Validation

Run:

```bash
python C:/Users/huawei/.codex/skills/.system/skill-creator/scripts/quick_validate.py .
```
