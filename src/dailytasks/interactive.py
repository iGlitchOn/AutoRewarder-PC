"""Quizzes, polls and This-or-That on an already-opened Bing/Rewards page."""

import random
import time

from ..utils import wait_or_stop

# Classic Rewards quiz / poll / this-or-that plus the newer Daily Set
# conversation quizzes (form=dsetqu / WQOskey).
_START_SELECTORS = (
    "#rqStartQuiz",
    "#startQuiz",
    "input[id='rqStartQuiz']",
    "input[name='rqStartQuiz']",
    "#rqStartQuizBtn",
)
_COMPLETE_SELECTORS = (
    "#quizCompleteContainer",
    "#quizComplete498498498",
    ".cico.rqDone",
    "[class*='quizComplete']",
)
_OPTION_SELECTORS = (
    "[id^='rqAnswerOption']",
    "#currentQuestionContainer .rqOption",
    ".rqOption",
    "#btoption0",
    "#btoption1",
    "[id^='btoption']",
    ".btOption",
    ".bt_poll .btOption",
    "#currentQuestionContainer .btOptions .btOption",
    "[data-correct='True']",
    "[iscorrect='True']",
    "[iscorrect='true']",
)
_NEXT_SELECTORS = (
    "#nextQuestionbtn",
    "input[id='nextQuestionbtn']",
    "[class*='nextQuestion']",
    "input[value='Next']",
    "input[value='Siguiente']",
    "button[aria-label='Next']",
    "button[aria-label='Siguiente']",
)


def complete_if_interactive(
    driver, log=None, stop_event=None, human=None, max_rounds=12
):
    """
    If the current page is a poll, quiz or This-or-That, click through it.

    Safe to call on ordinary search pages: it no-ops when none of the quiz
    surfaces are present. Returns True if it handled an interactive task.
    """
    if driver is None:
        return False
    if stop_event is not None and stop_event.is_set():
        return False

    try:
        url = (driver.current_url or "").lower()
    except Exception:
        url = ""

    looks_quiz = any(
        k in url
        for k in (
            "form=dsetqu",
            "wqoskey",
            "rq=",
            "quiz",
            "poll",
            "thisorthat",
            "btepokey",
        )
    )

    if _click_first(driver, _START_SELECTORS):
        if wait_or_stop(random.uniform(1.2, 2.0), stop_event):
            return False
        looks_quiz = True

    if not looks_quiz and not _any_present(driver, _OPTION_SELECTORS):
        return False

    if log:
        log("Interactive task: quiz/poll detected — answering.")

    handled = False
    for _ in range(max_rounds):
        if stop_event is not None and stop_event.is_set():
            return handled
        if _any_present(driver, _COMPLETE_SELECTORS):
            if log:
                log("Interactive task: finished.")
            return True

        if _click_correct_or_random(driver, human):
            handled = True
            if wait_or_stop(random.uniform(1.4, 2.4), stop_event):
                return handled
            _click_first(driver, _NEXT_SELECTORS)
            if wait_or_stop(random.uniform(0.6, 1.2), stop_event):
                return handled
            continue

        if not _click_conversation_option(driver, human):
            break
        handled = True
        if wait_or_stop(random.uniform(1.6, 2.8), stop_event):
            return handled

    return handled


def _any_present(driver, selectors):
    for sel in selectors:
        try:
            els = driver.find_elements("css selector", sel)
        except Exception:
            continue
        for el in els:
            try:
                if el.is_displayed():
                    return True
            except Exception:
                continue
    return False


def _click_first(driver, selectors):
    for sel in selectors:
        try:
            els = driver.find_elements("css selector", sel)
        except Exception:
            continue
        for el in els:
            if _try_click(driver, el):
                return True
    return False


def _click_correct_or_random(driver, human):
    options = []
    correct = []
    for sel in _OPTION_SELECTORS:
        try:
            found = driver.find_elements("css selector", sel)
        except Exception:
            continue
        for el in found:
            try:
                if not el.is_displayed():
                    continue
            except Exception:
                continue
            options.append(el)
            flag = (
                (el.get_attribute("data-correct") or "")
                + (el.get_attribute("iscorrect") or "")
                + (el.get_attribute("data-iscorrect") or "")
            ).lower()
            if flag in ("true", "1", "yes"):
                correct.append(el)
    pool = correct or options
    if not pool:
        return False
    target = random.choice(pool)
    return _try_click(driver, target, human)


def _click_conversation_option(driver, human):
    """Newer Daily Set quizzes render answers as chat/conversation buttons."""
    try:
        buttons = driver.find_elements(
            "css selector",
            "button, [role='button'], .b_syc_ans, [data-tag*='quiz'], "
            "[class*='quizOption'], [class*='optionCard']",
        )
    except Exception:
        return False
    candidates = []
    for el in buttons:
        try:
            if not el.is_displayed():
                continue
            text = (el.text or el.get_attribute("aria-label") or "").strip()
            if not text or len(text) > 160:
                continue
            low = text.lower()
            if low in (
                "search",
                "next",
                "skip",
                "share",
                "save",
                "redeem",
                "close",
            ):
                continue
            if any(
                k in low
                for k in (
                    "sign in",
                    "see more",
                    "learn more",
                    "privacy",
                    "settings",
                )
            ):
                continue
            w, h = el.size.get("width", 0), el.size.get("height", 0)
            if w < 24 or h < 16:
                continue
            candidates.append(el)
        except Exception:
            continue
    if not candidates:
        return False
    # Prefer mid-page answer chips over header chrome.
    return _try_click(driver, random.choice(candidates[:8]), human)


def _try_click(driver, el, human=None):
    try:
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
        time.sleep(random.uniform(0.2, 0.5))
        if human is not None:
            try:
                human.click_element(el, scroll_into_view=False)
                return True
            except Exception:
                pass
        try:
            el.click()
            return True
        except Exception:
            driver.execute_script("arguments[0].click();", el)
            return True
    except Exception:
        return False
