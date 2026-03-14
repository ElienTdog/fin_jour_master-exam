#!/usr/bin/env python3
import argparse
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from urllib import error, parse, request
from zoneinfo import ZoneInfo


FEISHU_BASE = "https://open.feishu.cn"
OPENAI_BASE = "https://api.openai.com/v1/chat/completions"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Weekly A-to-B question pipeline")
    parser.add_argument("--app-token", required=True)
    parser.add_argument("--table-a", required=True)
    parser.add_argument("--table-b", required=True)
    parser.add_argument("--timezone", default="Asia/Shanghai")
    parser.add_argument("--window", default="previous_week", choices=["previous_week"])
    parser.add_argument("--dry-run", default="true", choices=["true", "false"])
    parser.add_argument("--now", default=None, help="ISO datetime for test runs")
    parser.add_argument("--limit", type=int, default=0, help="0 means no limit")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO"])
    parser.add_argument("--max-source-chars", type=int, default=12000)
    parser.add_argument("--status-default", default="\u672a\u53d1\u5e03")
    parser.add_argument("--openai-model", default=os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
    return parser.parse_args()


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level),
        format="%(asctime)s [%(levelname)s] %(message)s",
    )


def parse_iso_now(value: Optional[str], tz: ZoneInfo) -> datetime:
    if not value:
        return datetime.now(tz)
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt.astimezone(tz)


def previous_week_range(now_local: datetime) -> Tuple[datetime, datetime]:
    monday_this_week = now_local.date() - timedelta(days=now_local.weekday())
    monday_prev_week = monday_this_week - timedelta(days=7)
    sunday_prev_week = monday_this_week - timedelta(days=1)
    start = datetime.combine(monday_prev_week, datetime.min.time(), tzinfo=now_local.tzinfo)
    end = datetime.combine(sunday_prev_week, datetime.max.time(), tzinfo=now_local.tzinfo)
    return start, end


def parse_a_date(date_raw: str) -> Optional[datetime]:
    if not date_raw:
        return None
    candidates = ["%y%m%d", "%Y/%m/%d", "%Y-%m-%d", "%Y%m%d"]
    for fmt in candidates:
        try:
            return datetime.strptime(date_raw.strip(), fmt)
        except ValueError:
            continue
    return None


def field_plain_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        parts: List[str] = []
        for item in value:
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
            elif isinstance(item, str):
                parts.append(item)
        return " ".join(part.strip() for part in parts if part and part.strip())
    if isinstance(value, (int, float)):
        return str(value)
    return ""


def extract_article_link_and_token(value: Any) -> Tuple[str, str]:
    if isinstance(value, str) and value.startswith("http"):
        token = value.rstrip("/").split("/")[-1]
        return value, token
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                link = item.get("link", "")
                token = item.get("token", "")
                if isinstance(link, str) and link.startswith("http"):
                    if not token:
                        token = link.rstrip("/").split("/")[-1]
                    return link, token
    return "", ""


def parse_openai_json(text: str) -> Optional[Dict[str, str]]:
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        return None
    return None


def build_fallback_content(source_text: str) -> Dict[str, str]:
    words = [w for w in re.split(r"\s+", source_text) if w]
    title = " ".join(words[:10]) if words else "Weekly Reading Reflection"
    if title and not title.endswith("..."):
        title = title[:80].strip()
    question = (
        "Based on this article, what is the key strategic trade-off, "
        "and how would you evaluate its long-term impact?"
    )
    outline = (
        "1) Identify the article's central claim. "
        "2) Explain two supporting factors with evidence. "
        "3) Discuss one major risk or limitation. "
        "4) Provide your own judgment and policy/business implication."
    )
    return {"title": title, "question": question, "outline": outline}


def to_epoch_ms(date_naive: datetime, tz: ZoneInfo) -> int:
    dt = datetime(date_naive.year, date_naive.month, date_naive.day, tzinfo=tz)
    return int(dt.timestamp() * 1000)


class HttpClient:
    def __init__(self, timeout_sec: int = 30):
        self.timeout_sec = timeout_sec

    def request_json(
        self,
        method: str,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        payload: Optional[Dict[str, Any]] = None,
        retries: int = 1,
    ) -> Dict[str, Any]:
        body = None
        req_headers = headers.copy() if headers else {}
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            req_headers["Content-Type"] = "application/json; charset=utf-8"

        last_err: Optional[Exception] = None
        for attempt in range(retries + 1):
            try:
                req = request.Request(url=url, data=body, headers=req_headers, method=method)
                with request.urlopen(req, timeout=self.timeout_sec) as resp:
                    raw = resp.read().decode("utf-8")
                    data = json.loads(raw) if raw else {}
                    if not isinstance(data, dict):
                        raise RuntimeError(f"Unexpected response type from {url}")
                    return data
            except (error.HTTPError, error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                last_err = exc
                if attempt < retries:
                    time.sleep(0.8 * (attempt + 1))
                    continue
                raise RuntimeError(f"HTTP request failed: {method} {url} ({exc})") from exc
        raise RuntimeError(f"HTTP request failed: {method} {url} ({last_err})")


class FeishuClient:
    def __init__(self, app_id: str, app_secret: str, http_client: HttpClient):
        self.app_id = app_id
        self.app_secret = app_secret
        self.http = http_client
        self.tenant_access_token = self._get_tenant_access_token()

    def _get_tenant_access_token(self) -> str:
        url = f"{FEISHU_BASE}/open-apis/auth/v3/tenant_access_token/internal/"
        payload = {"app_id": self.app_id, "app_secret": self.app_secret}
        resp = self.http.request_json("POST", url, payload=payload)
        if resp.get("code") != 0 or "tenant_access_token" not in resp:
            raise RuntimeError(f"Feishu auth failed: {resp}")
        return resp["tenant_access_token"]

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.tenant_access_token}"}

    def list_records(self, app_token: str, table_id: str, field_names: List[str]) -> List[Dict[str, Any]]:
        records: List[Dict[str, Any]] = []
        page_token = ""
        while True:
            url = (
                f"{FEISHU_BASE}/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/search"
                f"?page_size=500"
            )
            if page_token:
                url += f"&page_token={parse.quote(page_token)}"
            payload: Dict[str, Any] = {"field_names": field_names}
            resp = self.http.request_json(
                "POST",
                url,
                headers=self._headers(),
                payload=payload,
                retries=1,
            )
            if resp.get("code") != 0:
                raise RuntimeError(f"Bitable list_records failed: {resp}")
            data = resp.get("data", {})
            items = data.get("items", [])
            records.extend(items)
            if not data.get("has_more"):
                break
            page_token = data.get("page_token", "")
            if not page_token:
                break
        return records

    def create_record(self, app_token: str, table_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{FEISHU_BASE}/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"
        payload = {"fields": fields}
        resp = self.http.request_json("POST", url, headers=self._headers(), payload=payload, retries=1)
        if resp.get("code") != 0:
            raise RuntimeError(f"Bitable create_record failed: {resp}")
        return resp

    def wiki_to_docx_token(self, token: str) -> str:
        url = f"{FEISHU_BASE}/open-apis/wiki/v2/spaces/get_node?token={parse.quote(token)}"
        resp = self.http.request_json("GET", url, headers=self._headers(), retries=1)
        if resp.get("code") != 0:
            raise RuntimeError(f"Wiki resolve failed: {resp}")
        node = (resp.get("data") or {}).get("node") or {}
        obj_token = node.get("obj_token")
        if not isinstance(obj_token, str) or not obj_token:
            raise RuntimeError(f"Wiki resolve missing obj_token: {resp}")
        return obj_token

    def get_docx_raw_content(self, document_id: str) -> str:
        url = f"{FEISHU_BASE}/open-apis/docx/v1/documents/{parse.quote(document_id)}/raw_content"
        resp = self.http.request_json("GET", url, headers=self._headers(), retries=1)
        if resp.get("code") != 0:
            raise RuntimeError(f"Doc raw content failed: {resp}")
        content = (resp.get("data") or {}).get("content")
        if not isinstance(content, str):
            return ""
        return content.strip()


class OpenAIClient:
    def __init__(self, api_key: str, model: str, http_client: HttpClient):
        self.api_key = api_key
        self.model = model
        self.http = http_client

    def generate(self, source_text: str) -> Dict[str, str]:
        prompt = (
            "You are designing one interview-style thinking question for teachers.\n"
            "Return JSON only with keys: title, question, outline.\n"
            "Requirements:\n"
            "- Language: English.\n"
            "- title: <= 16 words.\n"
            "- question: one open-ended question grounded in article facts.\n"
            "- outline: 3-5 bullet-like points in one paragraph.\n"
            "- Avoid markdown.\n\n"
            f"Article:\n{source_text}"
        )
        payload = {
            "model": self.model,
            "temperature": 0.4,
            "messages": [
                {"role": "system", "content": "Return strict JSON object only."},
                {"role": "user", "content": prompt},
            ],
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        resp = self.http.request_json("POST", OPENAI_BASE, headers=headers, payload=payload, retries=1)
        choices = resp.get("choices") or []
        if not choices:
            raise RuntimeError(f"OpenAI empty response: {resp}")
        content = (((choices[0] or {}).get("message") or {}).get("content") or "").strip()
        parsed = parse_openai_json(content)
        if not parsed:
            raise RuntimeError(f"OpenAI non-JSON response: {content[:300]}")
        title = str(parsed.get("title", "")).strip()
        question = str(parsed.get("question", "")).strip()
        outline = str(parsed.get("outline", "")).strip()
        if not title or not question or not outline:
            raise RuntimeError(f"OpenAI missing fields: {parsed}")
        return {"title": title, "question": question, "outline": outline}


@dataclass
class Stats:
    scanned: int = 0
    matched_window: int = 0
    created: int = 0
    skipped_existing: int = 0
    failed: int = 0
    invalid_date: int = 0
    invalid_link: int = 0


def main() -> int:
    args = parse_args()
    configure_logging(args.log_level)

    dry_run = args.dry_run.lower() == "true"
    tz = ZoneInfo(args.timezone)
    now_local = parse_iso_now(args.now, tz)
    week_start, week_end = previous_week_range(now_local)

    app_id = os.getenv("FEISHU_APP_ID", "").strip()
    app_secret = os.getenv("FEISHU_APP_SECRET", "").strip()
    if not app_id or not app_secret:
        logging.error("Missing FEISHU_APP_ID or FEISHU_APP_SECRET")
        return 2

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    http_client = HttpClient()
    feishu = FeishuClient(app_id, app_secret, http_client)
    ai = OpenAIClient(openai_key, args.openai_model, http_client) if openai_key else None

    logging.info(
        "Window(previous_week): %s -> %s (%s)",
        week_start.isoformat(),
        week_end.isoformat(),
        args.timezone,
    )

    stats = Stats()

    a_records = feishu.list_records(
        args.app_token,
        args.table_a,
        field_names=["primarykey", "article_url", "date", "\u7c7b\u578b"],
    )
    existing_b = feishu.list_records(
        args.app_token,
        args.table_b,
        field_names=["\u9898\u76ee\u7f16\u53f7"],
    )
    existing_ids = set()
    for row in existing_b:
        fields = row.get("fields", {})
        qid = field_plain_text(fields.get("\u9898\u76ee\u7f16\u53f7"))
        if qid:
            existing_ids.add(qid)

    for row in a_records:
        stats.scanned += 1
        record_id = row.get("record_id", "")
        fields = row.get("fields", {})

        pk_text = field_plain_text(fields.get("primarykey"))
        if not pk_text:
            logging.warning("Skip row(%s): missing primarykey", record_id)
            stats.failed += 1
            continue
        question_id = str(pk_text).zfill(4)

        date_text = field_plain_text(fields.get("date"))
        parsed_date = parse_a_date(date_text)
        if not parsed_date:
            logging.warning("Skip row(%s): invalid date '%s'", record_id, date_text)
            stats.invalid_date += 1
            stats.failed += 1
            continue

        local_day = datetime(parsed_date.year, parsed_date.month, parsed_date.day, tzinfo=tz)
        if local_day < week_start or local_day > week_end:
            continue
        stats.matched_window += 1

        if question_id in existing_ids:
            stats.skipped_existing += 1
            logging.info("Skip existing question_id=%s", question_id)
            continue

        link, token = extract_article_link_and_token(fields.get("article_url"))
        if not link or not token:
            logging.warning("Skip row(%s): invalid article_url", record_id)
            stats.invalid_link += 1
            stats.failed += 1
            continue

        try:
            docx_token = feishu.wiki_to_docx_token(token)
        except Exception:
            docx_token = token

        try:
            raw_content = feishu.get_docx_raw_content(docx_token)
        except Exception as exc:
            logging.error("Doc fetch failed row(%s): %s", record_id, exc)
            stats.failed += 1
            continue

        if not raw_content:
            logging.warning("Skip row(%s): empty document content", record_id)
            stats.failed += 1
            continue

        truncated = raw_content[: args.max_source_chars]
        generated: Dict[str, str]
        try:
            if ai:
                generated = ai.generate(truncated)
            else:
                generated = build_fallback_content(truncated)
        except Exception as exc:
            logging.warning("Generation retry row(%s): %s", record_id, exc)
            try:
                if ai:
                    generated = ai.generate(truncated)
                else:
                    generated = build_fallback_content(truncated)
            except Exception as exc2:
                logging.error("Generation failed row(%s): %s", record_id, exc2)
                stats.failed += 1
                continue

        payload_fields = {
            "\u9898\u76ee\u7f16\u53f7": question_id,
            "\u53d1\u5e03\u72b6\u6001": args.status_default,
            "\u9002\u7528\u4e13\u4e1a": field_plain_text(fields.get("\u7c7b\u578b")),
            "\u6587\u7ae0\u6807\u9898": generated["title"],
            "\u9898\u76ee\u5185\u5bb9": generated["question"],
            "\u53c2\u8003\u601d\u8def": generated["outline"],
            "\u539f\u6587\u94fe\u63a5": link,
            "\u539f\u6587\u5185\u5bb9": raw_content,
            "\u65e5\u671f": to_epoch_ms(parsed_date, tz),
        }

        if dry_run:
            logging.info(
                "DRY-RUN create question_id=%s title=%s",
                question_id,
                generated["title"],
            )
            stats.created += 1
            continue

        try:
            feishu.create_record(args.app_token, args.table_b, payload_fields)
            existing_ids.add(question_id)
            stats.created += 1
            logging.info("Created question_id=%s", question_id)
        except Exception as exc:
            logging.warning("Write retry row(%s): %s", record_id, exc)
            try:
                feishu.create_record(args.app_token, args.table_b, payload_fields)
                existing_ids.add(question_id)
                stats.created += 1
                logging.info("Created(after retry) question_id=%s", question_id)
            except Exception as exc2:
                logging.error("Write failed row(%s): %s", record_id, exc2)
                stats.failed += 1

        if args.limit and stats.created >= args.limit:
            logging.info("Limit reached: %s", args.limit)
            break

    summary = {
        "dry_run": dry_run,
        "window_start": week_start.isoformat(),
        "window_end": week_end.isoformat(),
        "scanned": stats.scanned,
        "matched_window": stats.matched_window,
        "created": stats.created,
        "skipped_existing": stats.skipped_existing,
        "failed": stats.failed,
        "invalid_date": stats.invalid_date,
        "invalid_link": stats.invalid_link,
    }
    logging.info("SUMMARY %s", json.dumps(summary, ensure_ascii=False))
    return 0 if stats.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

