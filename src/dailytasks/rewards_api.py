"""Live Microsoft Rewards state from getuserinfo + offer filters.

status.json dates lie. The dashboard API and on-page counters are the
source of truth for whether a task is still open.
"""

import re
from datetime import date, datetime, timedelta

SKIP_TITLE_RE = re.compile(
    r"game pass|xbox|donat|canjear|redeem|default search|bing as default|"
    r"buscador predeterminado|fondo de pantalla|wallpaper|"
    r"\brefer\b|\breferir\b|invita a un|star bonus|copilot|"
    r"shop with bing|microsoft store|bluestacks|"
    r"amazon|spotify|masterclass",
    re.I,
)
SKIP_URL_RE = re.compile(
    r"xbox\.com|microsoft\.com/store|aka\.ms|rewards\.bing\.com/redeem|"
    r"rewards\.bing\.com/refer|ms-settings:|play\.google|apps\.apple",
    re.I,
)


def skip_offer(title, url=""):
    """True for promos the bot must not click or show as live quests."""
    blob = f"{title or ''} {url or ''}"
    return bool(SKIP_TITLE_RE.search(blob) or SKIP_URL_RE.search(blob))


def fetch_userinfo(driver):
    """GET /api/getuserinfo in the logged-in Rewards session. None on failure."""
    if driver is None:
        return None
    try:
        driver.set_script_timeout(18)
        return driver.execute_async_script("""
            const done = arguments[0];
            fetch('/api/getuserinfo?type=1', {
              credentials: 'include',
              headers: {Accept: 'application/json'}
            })
              .then(r => r.json())
              .then(done)
              .catch(() => done(null));
            """)
    except Exception:
        return None


def _first_counter(counters, *names):
    if not isinstance(counters, dict):
        return None
    lower = {str(k).lower(): v for k, v in counters.items()}
    for name in names:
        value = counters.get(name) or lower.get(name.lower())
        if isinstance(value, list) and value:
            value = value[0]
        if isinstance(value, dict):
            done = value.get("pointProgress")
            total = value.get("pointProgressMax")
            if isinstance(done, int) and isinstance(total, int) and total > 0:
                return done, total
    return None


def parse_userinfo(data):
    """
    Flatten getuserinfo into counters the rest of the app already uses.

    Returns:
        dict with optional keys: pc, mobile, news, daily, checkin, claim,
        punchcards (list of {url,title,done,total,complete}).
    """
    out = {}
    if not isinstance(data, dict):
        return out
    dash = data.get("dashboard") or data
    if not isinstance(dash, dict):
        return out
    status = dash.get("userStatus") or {}
    counters = status.get("counters") or {}

    pc = _first_counter(counters, "pcSearch", "pcsearch")
    if pc:
        out["pc"] = pc
    mobile = _first_counter(counters, "mobileSearch", "mobilesearch")
    if mobile:
        out["mobile"] = mobile
    news = _first_counter(counters, "readArticle", "readarticle", "newsSearch")
    if news:
        out["news"] = list(news)

    quiz = _first_counter(counters, "activityAndQuiz")
    if quiz:
        out["quizzes"] = list(quiz)

    promotions = dash.get("dailySetPromotions") or {}
    if isinstance(promotions, dict) and promotions:
        today = date.today()
        today_keys = {
            today.strftime("%m/%d/%Y"),
            f"{today.month}/{today.day}/{today.year}",
            today.isoformat(),
        }
        items = []
        for day, group in promotions.items():
            if str(day) not in today_keys:
                continue
            if isinstance(group, list):
                items.extend(group)
            elif isinstance(group, dict):
                items.append(group)
        if items:
            done = sum(1 for it in items if isinstance(it, dict) and it.get("complete"))
            out["daily"] = [done, len(items)]

    checkin = False
    for promo in list(dash.get("promotionalItems") or []) + list(
        dash.get("morePromotions") or []
    ):
        if not isinstance(promo, dict):
            continue
        parent = promo.get("parentPromotion") or promo
        ptype = str(parent.get("promotionType") or "").lower()
        title = " ".join(
            str(parent.get(k) or "") for k in ("name", "title", "description")
        ).lower()
        if ptype == "checkin" or "check-in" in title or "check in" in title:
            checkin = True
            out["checkin"] = [1, 1] if parent.get("complete") else [0, 1]
            dest = parent.get("destination") or promo.get("destination")
            if dest:
                out["checkin_url"] = dest
            break
    if not checkin:
        # Keep absence distinct from 1/1 so the UI cannot inherit Search 1/1.
        out.setdefault("checkin", None)

    punchcards = []
    for card in dash.get("punchCards") or []:
        if not isinstance(card, dict):
            continue
        parent = card.get("parentPromotion") or card
        dest = parent.get("destination") or ""
        title = parent.get("title") or parent.get("name") or "Punchcard"
        child = card.get("childPromotions") or []
        total = len(child) if isinstance(child, list) else 0
        done = (
            sum(1 for c in child if isinstance(c, dict) and c.get("complete"))
            if total
            else 0
        )
        punchcards.append(
            {
                "url": dest,
                "title": title,
                "done": done,
                "total": total,
                "complete": bool(parent.get("complete"))
                or (total > 0 and done >= total),
                "points": parent.get("pointProgressMax") or parent.get("points"),
            }
        )
    if punchcards:
        out["punchcards"] = punchcards
    return out


def hours_until_daily_reset(tz_name="America/Bogota"):
    """Hours until local midnight in the Rewards market (not 24h from completion)."""
    try:
        from zoneinfo import ZoneInfo

        now = datetime.now(ZoneInfo(tz_name))
    except Exception:
        now = datetime.now()
    nxt = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    hours = int((nxt - now).total_seconds() // 3600)
    return max(0, hours)


def merge_live(page_live, api_live):
    """API counters win when present; page text fills the gaps."""
    merged = dict(page_live or {})
    api_live = api_live or {}
    for key in ("daily", "news", "checkin", "pc", "mobile"):
        value = api_live.get(key)
        if value:
            merged[key] = value
    if api_live.get("checkin") is None and "checkin" not in (page_live or {}):
        merged.pop("checkin", None)
    return merged
