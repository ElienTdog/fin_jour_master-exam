#!/usr/bin/env python3
import argparse
import email.utils
import json
import logging
import os
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib import error, parse, request
from zoneinfo import ZoneInfo


FEISHU_BASE = "https://open.feishu.cn"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Daily article ingest into Feishu Bitable A")
    parser.add_argument("--app-token", required=True)
    parser.add_argument("--table-a", required=True)
    parser.add_argument("--timezone", default="Asia/Shanghai")
    parser.add_argument("--dry-run", default="true", choices=["true", "false"])
    parser.add_argument("--sources-file", default="", help="JSON file for source feeds")
    parser.add_argument("--max-items-per-source", type=int, default=20)
    parser.add_argument("--limit-created", type=int, default=0, help="0 means no limit")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO"])
    return parser.parse_args()


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level),
        format="%(asctime)s [%(levelname)s] %(message)s",
    )


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
        for attempt in range(retries + 1):
            try:
                req = request.Request(url=url, data=body, headers=req_headers, method=method)
                with request.urlopen(req, timeout=self.timeout_sec) as resp:
                    raw = resp.read().decode("utf-8")
                    parsed_json = json.loads(raw) if raw else {}
                    if not isinstance(parsed_json, dict):
                        raise RuntimeError("Unexpected JSON response")
                    return parsed_json
            except (error.HTTPError, error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                if attempt < retries:
                    time.sleep(0.8 * (attempt + 1))
                    continue
                raise RuntimeError(f"HTTP request failed: {method} {url} ({exc})") from exc
        raise RuntimeError(f"HTTP request failed: {method} {url}")

    def get_text(self, url: str, retries: int = 1) -> str:
        for attempt in range(retries + 1):
            try:
                req = request.Request(
                    url=url,
                    headers={"User-Agent": "lark-weekly-question-sop/1.0"},
                    method="GET",
                )
                with request.urlopen(req, timeout=self.timeout_sec) as resp:
                    return resp.read().decode("utf-8", errors="replace")
            except (error.HTTPError, error.URLError, TimeoutError) as exc:
                if attempt < retries:
                    time.sleep(0.8 * (attempt + 1))
                    continue
                raise RuntimeError(f"Feed request failed: {url} ({exc})") from exc
        raise RuntimeError(f"Feed request failed: {url}")


class FeishuClient:
    def __init__(self, app_id: str, app_secret: str, http_client: HttpClient):
        self.http = http_client
        self.token = self._tenant_token(app_id, app_secret)

    def _tenant_token(self, app_id: str, app_secret: str) -> str:
        url = f"{FEISHU_BASE}/open-apis/auth/v3/tenant_access_token/internal/"
        payload = {"app_id": app_id, "app_secret": app_secret}
        resp = self.http.request_json("POST", url, payload=payload)
        if resp.get("code") != 0 or "tenant_access_token" not in resp:
            raise RuntimeError(f"Feishu auth failed: {resp}")
        return resp["tenant_access_token"]

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}

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
            resp = self.http.request_json("POST", url, headers=self._headers(), payload=payload, retries=1)
            if resp.get("code") != 0:
                raise RuntimeError(f"Bitable list_records failed: {resp}")
            data = resp.get("data", {})
            records.extend(data.get("items", []))
            if not data.get("has_more"):
                break
            page_token = data.get("page_token", "")
            if not page_token:
                break
        return records

    def create_record(self, app_token: str, table_id: str, fields: Dict[str, Any]) -> None:
        url = f"{FEISHU_BASE}/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"
        payload = {"fields": fields}
        resp = self.http.request_json("POST", url, headers=self._headers(), payload=payload, retries=1)
        if resp.get("code") != 0:
            raise RuntimeError(f"Bitable create_record failed: {resp}")


def field_plain_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        parts: List[str] = []
        for item in value:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"].strip())
            elif isinstance(item, str):
                parts.append(item.strip())
        return " ".join(x for x in parts if x)
    if isinstance(value, (int, float)):
        return str(value)
    return ""


def extract_article_url(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict) and isinstance(item.get("link"), str):
                return item["link"].strip()
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                text = item["text"].strip()
                if text.startswith("http"):
                    return text
    return ""


def normalize_link(link: str) -> str:
    return link.rstrip("/")


def parse_item_date(raw: str, tz: ZoneInfo) -> datetime:
    if raw:
        parsed = email.utils.parsedate_to_datetime(raw)
        if parsed:
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=tz)
            return parsed.astimezone(tz)
    return datetime.now(tz)


def to_yyMMdd(dt: datetime) -> str:
    return dt.strftime("%y%m%d")


def text_or_empty(element: Optional[ET.Element], tag: str) -> str:
    if element is None:
        return ""
    target = element.find(tag)
    if target is None or target.text is None:
        return ""
    return target.text.strip()


def parse_rss(xml_text: str, default_type: str, source_name: str, max_items: int, tz: ZoneInfo) -> List[Dict[str, str]]:
    root = ET.fromstring(xml_text)
    items: List[Dict[str, str]] = []

    channel = root.find("channel")
    if channel is not None:
        for item in channel.findall("item")[:max_items]:
            link = text_or_empty(item, "link")
            title = text_or_empty(item, "title")
            date_raw = text_or_empty(item, "pubDate")
            if not link:
                continue
            dt = parse_item_date(date_raw, tz)
            items.append(
                {
                    "title": title,
                    "link": link,
                    "type": default_type,
                    "date": to_yyMMdd(dt),
                    "source_name": source_name,
                }
            )
        return items

    ns_atom = "{http://www.w3.org/2005/Atom}"
    for entry in root.findall(f"{ns_atom}entry")[:max_items]:
        title_el = entry.find(f"{ns_atom}title")
        title = title_el.text.strip() if title_el is not None and title_el.text else ""
        link = ""
        for link_el in entry.findall(f"{ns_atom}link"):
            href = (link_el.attrib or {}).get("href", "")
            if href:
                link = href.strip()
                break
        updated_el = entry.find(f"{ns_atom}updated")
        date_raw = updated_el.text.strip() if updated_el is not None and updated_el.text else ""
        if not link:
            continue
        dt = parse_item_date(date_raw, tz)
        items.append(
            {
                "title": title,
                "link": link,
                "type": default_type,
                "date": to_yyMMdd(dt),
                "source_name": source_name,
            }
        )
    return items


def load_sources(args: argparse.Namespace) -> List[Dict[str, str]]:
    if args.sources_file:
        with open(args.sources_file, "r", encoding="utf-8") as f:
            payload = json.load(f)
        if not isinstance(payload, list):
            raise RuntimeError("sources-file must be a JSON array")
        return payload

    env_json = os.getenv("ARTICLE_SOURCES_JSON", "").strip()
    if env_json:
        payload = json.loads(env_json)
        if not isinstance(payload, list):
            raise RuntimeError("ARTICLE_SOURCES_JSON must be a JSON array")
        return payload

    raise RuntimeError("No sources configured. Set --sources-file or ARTICLE_SOURCES_JSON")


@dataclass
class Stats:
    feeds: int = 0
    feed_items: int = 0
    candidate_items: int = 0
    created: int = 0
    skipped_dup: int = 0
    failed: int = 0


def main() -> int:
    args = parse_args()
    configure_logging(args.log_level)
    dry_run = args.dry_run.lower() == "true"
    tz = ZoneInfo(args.timezone)

    app_id = os.getenv("FEISHU_APP_ID", "").strip()
    app_secret = os.getenv("FEISHU_APP_SECRET", "").strip()
    if not app_id or not app_secret:
        logging.error("Missing FEISHU_APP_ID or FEISHU_APP_SECRET")
        return 2

    sources = load_sources(args)
    http_client = HttpClient()
    feishu = FeishuClient(app_id, app_secret, http_client)

    stats = Stats()
    existing = feishu.list_records(args.app_token, args.table_a, ["primarykey", "article_url", "date", "类型"])
    existing_urls = set()
    max_primarykey = 0
    for row in existing:
        fields = row.get("fields", {})
        url = normalize_link(extract_article_url(fields.get("article_url")))
        if url:
            existing_urls.add(url)
        pk_text = field_plain_text(fields.get("primarykey"))
        try:
            max_primarykey = max(max_primarykey, int(float(pk_text)))
        except ValueError:
            continue

    next_pk = max_primarykey + 1
    for source in sources:
        url = str(source.get("url", "")).strip()
        if not url:
            continue
        source_type = str(source.get("type", "")).strip() or "金融"
        source_name = str(source.get("name", "")).strip() or url

        stats.feeds += 1
        try:
            xml_text = http_client.get_text(url, retries=1)
            parsed_items = parse_rss(xml_text, source_type, source_name, args.max_items_per_source, tz)
        except Exception as exc:
            logging.error("Feed failed (%s): %s", source_name, exc)
            stats.failed += 1
            continue

        stats.feed_items += len(parsed_items)
        for item in parsed_items:
            stats.candidate_items += 1
            link = normalize_link(item["link"])
            if not link:
                continue
            if link in existing_urls:
                stats.skipped_dup += 1
                continue

            fields = {
                "primarykey": next_pk,
                "article_url": link,
                "date": item["date"],
                "类型": item["type"],
            }

            if dry_run:
                logging.info("DRY-RUN create A primarykey=%s type=%s link=%s", next_pk, item["type"], link)
                stats.created += 1
                existing_urls.add(link)
                next_pk += 1
            else:
                try:
                    feishu.create_record(args.app_token, args.table_a, fields)
                    logging.info("Created A primarykey=%s type=%s source=%s", next_pk, item["type"], source_name)
                    stats.created += 1
                    existing_urls.add(link)
                    next_pk += 1
                except Exception as exc:
                    logging.warning("Write retry primarykey=%s: %s", next_pk, exc)
                    try:
                        feishu.create_record(args.app_token, args.table_a, fields)
                        logging.info("Created(after retry) A primarykey=%s", next_pk)
                        stats.created += 1
                        existing_urls.add(link)
                        next_pk += 1
                    except Exception as exc2:
                        logging.error("Write failed primarykey=%s: %s", next_pk, exc2)
                        stats.failed += 1

            if args.limit_created and stats.created >= args.limit_created:
                break

        if args.limit_created and stats.created >= args.limit_created:
            break

    summary = {
        "dry_run": dry_run,
        "feeds": stats.feeds,
        "feed_items": stats.feed_items,
        "candidate_items": stats.candidate_items,
        "created": stats.created,
        "skipped_dup": stats.skipped_dup,
        "failed": stats.failed,
    }
    logging.info("SUMMARY %s", json.dumps(summary, ensure_ascii=False))
    return 0 if stats.failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
