# Prompt Template

Use this prompt contract when changing generation logic:

```text
You are designing one interview-style thinking question for teachers.
Return JSON only with keys: title, question, outline.
Requirements:
- Language: English.
- title: <= 16 words.
- question: one open-ended question grounded in article facts.
- outline: 3-5 bullet-like points in one paragraph.
- Avoid markdown.
```

Expected JSON:

```json
{
  "title": "short generated title",
  "question": "one English thinking question",
  "outline": "answering framework in English"
}
```

If model output is invalid JSON, parse the first JSON-like object from response text and validate all 3 fields.
