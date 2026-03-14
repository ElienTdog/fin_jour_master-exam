# Field Mapping

## Source table A (`tblJtP7hMKzCrhGT`)

- `primarykey` (Number)
- `article_url` (Text mention object or URL string)
- `date` (Text, expected `yyMMdd`, e.g. `260117`)
- `类型` (Text)

## Phase 2 write contract (feeds -> A)

- `primarykey` <- integer, generated as `max(existing primarykey) + 1`
- `article_url` <- normalized URL string from feed item
- `date` <- feed publish date in `yyMMdd` text
- `类型` <- source config value (`金融` or `新传`)

Dedup key in Phase 2:
- normalized `article_url` (strip trailing `/`)

## Target table B (`tblH8zlAGAc1hiN2`)

- `题目编号` <- `zfill(4, primarykey)`
- `发布状态` <- constant `未发布`
- `适用专业` <- `类型`
- `文章标题` <- generated from source content (English)
- `题目内容` <- generated question (English)
- `参考思路` <- generated answering outline (English)
- `原文链接` <- `article_url.link`
- `原文内容` <- raw docx content
- `日期` <- parsed `date` converted to epoch milliseconds

## Idempotency

- Check existing B records by `题目编号`.
- If already exists, skip write and log.
