"""Rewards items the bot cannot finish — shown so the user can do them."""

CATALOG = (
    {
        "id": "default_bing",
        "title": "Set Bing as default search",
        "title_es": "Pon Bing como buscador predeterminado",
        "detail": "Windows must use Bing/Edge as the default search engine for 14 days. Opens Default apps.",
        "detail_es": "Windows tiene que usar Bing/Edge 14 días. Abre Aplicaciones predeterminadas.",
        "url": "ms-settings:defaultapps",
        "kind": "system",
    },
    {
        "id": "xbox_gamepass",
        "title": "Xbox Game Pass Ultimate",
        "title_es": "Xbox Game Pass Ultimate",
        "detail": "Paid subscription or trial. Opens the Xbox Game Pass page.",
        "detail_es": "Suscripción o prueba de pago. Abre la página de Xbox Game Pass.",
        "url": "https://www.xbox.com/xbox-game-pass",
        "kind": "purchase",
    },
    {
        "id": "donate",
        "title": "Donate points",
        "title_es": "Donar puntos",
        "detail": "Sweetheart and similar badges spend your points on charity (from 1,000 pts).",
        "detail_es": "Insignias como Sweetheart gastan puntos en donación (desde 1.000).",
        "url": "https://rewards.bing.com/redeem",
        "kind": "spend",
    },
    {
        "id": "refer",
        "title": "Refer and Earn",
        "title_es": "Invitar y ganar",
        "detail": "Invite someone to Microsoft Rewards with your link.",
        "detail_es": "Invita a alguien a Microsoft Rewards con tu enlace.",
        "url": "https://rewards.bing.com/refer",
        "kind": "social",
    },
    {
        "id": "star_bonus",
        "title": "Bing STAR bonus",
        "title_es": "Bono Bing STAR",
        "detail": "Fills on its own this month if you search and finish dailies. No extra click.",
        "detail_es": "Se llena solo este mes si buscas y cierras las tareas. No hay un clic extra.",
        "url": "https://rewards.bing.com/earn",
        "kind": "info",
    },
    {
        "id": "wallpaper",
        "title": "Bing wallpaper drop",
        "title_es": "Fondo de Bing",
        "detail": "If the earn-page wallpaper card is still open, create or download it there.",
        "detail_es": "Si la tarjeta de fondo sigue abierta en /earn, créalo o descárgalo ahí.",
        "url": "https://www.bing.com/wallpaper?form=REWDSK",
        "kind": "optional",
    },
    {
        "id": "redeem",
        "title": "Redeem / coupons / goal",
        "title_es": "Canjear / cupones / meta",
        "detail": "Spend points in the Rewards store (gift cards, Roblox, coupons).",
        "detail_es": "Gasta puntos en la tienda de Rewards (tarjetas, Roblox, cupones).",
        "url": "https://rewards.bing.com/redeem",
        "kind": "spend",
    },
    {
        "id": "gold_levelup",
        "title": "Gold level-up activities",
        "title_es": "Actividades para subir a Gold",
        "detail": "7-day Daily Set and 7-day search streaks. Keep running Start / Tasks only each day.",
        "detail_es": "Racha de 7 días del Daily Set y de búsquedas. Sigue con Iniciar o Solo tareas cada día.",
        "url": "https://rewards.bing.com/earn",
        "kind": "info",
    },
)


def catalog_by_id():
    return {item["id"]: dict(item) for item in CATALOG}


def _localized(row, lang):
    if lang != "es":
        return row
    if row.get("title_es"):
        row["title"] = row["title_es"]
    if row.get("detail_es"):
        row["detail"] = row["detail_es"]
    return row


def list_tasks(ignored=None, removed=None, live=None, lang="en"):
    ignored = set(ignored or [])
    removed = set(removed or [])
    out = []
    seen = set()
    source = list(live) if live else []
    source.extend(CATALOG)
    for item in source:
        if not isinstance(item, dict):
            continue
        row = dict(item)
        task_id = str(row.get("id") or row.get("url") or "")
        row["id"] = task_id
        if not task_id or task_id in removed or task_id in seen:
            continue
        seen.add(task_id)
        row["ignored"] = task_id in ignored
        out.append(_localized(row, lang))
    return out
