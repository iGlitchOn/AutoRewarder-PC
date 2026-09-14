import json
import os
import sys
import urllib.error
import urllib.request

REPO = os.environ.get("BADGE_REPO") or "iGlitchOn/AutoRewarder-PC"
GIST_ID = (os.environ.get("GIST_ID") or "").strip()
GIST_TOKEN = (os.environ.get("GIST_TOKEN") or "").strip()


def format_number(num):
    if num >= 1000:
        return f"{num/1000:.1f}k"
    return str(num)


def fetch_api(url, token=None, timeout=15):
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "AutoRewarder-badges")
    req.add_header("Accept", "application/vnd.github+json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read())


def main():
    try:
        releases = fetch_api(f"https://api.github.com/repos/{REPO}/releases")
        if not isinstance(releases, list):
            releases = []
        total_downloads = sum(
            asset["download_count"]
            for release in releases
            for asset in release.get("assets", [])
        )

        repo_info = fetch_api(f"https://api.github.com/repos/{REPO}")
        stars = (repo_info or {}).get("stargazers_count", 0)

        downloads_badge = {
            "schemaVersion": 1,
            "label": "DOWNLOADS",
            "message": format_number(total_downloads),
            "color": "3FB950",
            "style": "for-the-badge",
        }

        stars_badge = {
            "schemaVersion": 1,
            "label": "STARS",
            "message": format_number(stars),
            "color": "e3b341",
            "style": "for-the-badge",
        }

        print(f"Downloads: {total_downloads}, Stars: {stars} ({REPO})")
        if not GIST_ID or not GIST_TOKEN:
            print("Skipping gist update: GIST_ID/GIST_TOKEN missing.")
            return 0

        gist_url = f"https://api.github.com/gists/{GIST_ID}"
        gist_data = {
            "files": {
                "downloads.json": {"content": json.dumps(downloads_badge)},
                "stars.json": {"content": json.dumps(stars_badge)},
            }
        }
        patch_req = urllib.request.Request(
            gist_url, data=json.dumps(gist_data).encode("utf-8"), method="PATCH"
        )
        patch_req.add_header("User-Agent", "AutoRewarder-badges")
        patch_req.add_header("Authorization", "Bearer " + GIST_TOKEN)
        patch_req.add_header("Accept", "application/vnd.github+json")
        with urllib.request.urlopen(patch_req, timeout=15):
            print("Gist updated.")
        return 0
    except (
        urllib.error.URLError,
        urllib.error.HTTPError,
        TimeoutError,
        OSError,
        ValueError,
    ) as err:
        print(f"Badge update skipped: {err}")
        return 0


if __name__ == "__main__":
    sys.exit(main())
