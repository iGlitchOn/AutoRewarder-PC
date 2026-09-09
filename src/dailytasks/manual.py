"""Rewards items the bot cannot finish — shown so the user can do them."""

CATALOG = (
    {
        "id": "default_bing",
        "title": "Set Bing as default search",
        "detail": "Windows must use Bing/Edge as the default search engine for 14 days. Opens Default apps.",
        "url": "ms-settings:defaultapps",
        "kind": "system",
    },
    {
        "id": "xbox_gamepass",
        "title": "Xbox Game Pass Ultimate",
        "detail": "Paid subscription or trial. Opens the Xbox Game Pass page.",
        "url": "https://www.xbox.com/xbox-game-pass",
        "kind": "purchase",
    },
    {
        "id": "donate",
        "title": "Donate points",
        "detail": "Sweetheart and similar badges spend your points on charity (from 1,000 pts).",
        "url": "https://rewards.bing.com/redeem",
        "kind": "spend",
    },
    {
        "id": "refer",
        "title": "Refer and Earn",
        "detail": "Invite someone to Microsoft Rewards with your link.",
        "url": "https://rewards.bing.com/refer",
        "kind": "social",
    },
    {
        "id": "star_bonus",
        "title": "Bing STAR bonus",
        "detail": "Fills on its own this month if you search and finish dailies. No extra click.",
        "url": "https://rewards.bing.com/earn",
        "kind": "info",
    },
    {
        "id": "wallpaper",
        "title": "Bing wallpaper drop",
        "detail": "If the earn-page wallpaper card is still open, create or download it there.",
        "url": "https://www.bing.com/wallpaper?form=REWDSK",
        "kind": "optional",
    },
    {
        "id": "redeem",
        "title": "Redeem / coupons / goal",
        "detail": "Spend points in the Rewards store (gift cards, Roblox, coupons).",
        "url": "https://rewards.bing.com/redeem",
        "kind": "spend",
    },
    {
        "id": "gold_levelup",
        "title": "Gold level-up activities",
        "detail": "7-day Daily Set and 7-day search streaks. Keep running Start / Tasks only each day.",
        "url": "https://rewards.bing.com/earn",
        "kind": "info",
    },
)


def catalog_by_id():
    return {item["id"]: dict(item) for item in CATALOG}


def list_tasks(ignored=None, removed=None, live=None):
    ignored = set(ignored or [])
    removed = set(removed or [])
    out = []
    source = list(live) if live else []
    for item in source:
        if not isinstance(item, dict):
            continue
        row = dict(item)
        task_id = str(row.get("id") or row.get("url") or "")
        row["id"] = task_id
        if not task_id or task_id in removed:
            continue
        row["ignored"] = task_id in ignored
        out.append(row)
    return out
