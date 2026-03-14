# Scheduler Examples

## GitHub Actions

```yaml
name: Question SOP Pipelines

on:
  schedule:
    - cron: "0 1 * * 1" # Monday 09:00 Asia/Shanghai (weekly A->B)
    - cron: "0 0 * * *" # Daily 08:00 Asia/Shanghai (feeds->A)
  workflow_dispatch:

jobs:
  daily-ingest:
    if: github.event_name == 'workflow_dispatch' || github.event.schedule == '0 0 * * *'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Run daily ingest
        env:
          FEISHU_APP_ID: ${{ secrets.FEISHU_APP_ID }}
          FEISHU_APP_SECRET: ${{ secrets.FEISHU_APP_SECRET }}
        run: |
          python skills/lark-weekly-question-sop/scripts/daily_article_ingest.py \
            --app-token Pyddb4ZISahwSXsdzOrcaaljnQg \
            --table-a tblJtP7hMKzCrhGT \
            --timezone Asia/Shanghai \
            --sources-file skills/lark-weekly-question-sop/references/ingest-config.example.json \
            --dry-run false

  weekly-question-pipeline:
    if: github.event_name == 'workflow_dispatch' || github.event.schedule == '0 1 * * 1'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Run weekly question pipeline
        env:
          FEISHU_APP_ID: ${{ secrets.FEISHU_APP_ID }}
          FEISHU_APP_SECRET: ${{ secrets.FEISHU_APP_SECRET }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          python skills/lark-weekly-question-sop/scripts/run_weekly_pipeline.py \
            --app-token Pyddb4ZISahwSXsdzOrcaaljnQg \
            --table-a tblJtP7hMKzCrhGT \
            --table-b tblH8zlAGAc1hiN2 \
            --timezone Asia/Shanghai \
            --window previous_week \
            --dry-run false
```

## Windows Task Scheduler

Create two tasks.

### Task 1: Daily Ingest (08:00 daily)
- Program: `python`
- Arguments:

```text
e:\Vian\test_sys\fin_jour_master-exam-main\fin_jour_master-exam-main\skills\lark-weekly-question-sop\scripts\daily_article_ingest.py --app-token Pyddb4ZISahwSXsdzOrcaaljnQg --table-a tblJtP7hMKzCrhGT --timezone Asia/Shanghai --sources-file e:\Vian\test_sys\fin_jour_master-exam-main\fin_jour_master-exam-main\skills\lark-weekly-question-sop\references\ingest-config.example.json --dry-run false
```

### Task 2: Weekly Question Pipeline (Monday 09:00)
- Program: `python`
- Arguments:

```text
e:\Vian\test_sys\fin_jour_master-exam-main\fin_jour_master-exam-main\skills\lark-weekly-question-sop\scripts\run_weekly_pipeline.py --app-token Pyddb4ZISahwSXsdzOrcaaljnQg --table-a tblJtP7hMKzCrhGT --table-b tblH8zlAGAc1hiN2 --timezone Asia/Shanghai --window previous_week --dry-run false
```

Set environment variables at machine/user scope:
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `OPENAI_API_KEY` (for weekly generation)
