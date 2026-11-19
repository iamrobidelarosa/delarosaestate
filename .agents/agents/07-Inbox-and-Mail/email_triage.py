#!/usr/bin/env python3
"""
Hermes Email Triage Engine — Executive Mail Secretary
Scans, categorizes, flags priority correspondence, and purges spam/promotions.
Author: Hermes (@email-manager) | Supervisor: Mooji
"""

import os
import sys
import email
from email.header import decode_header
import imaplib
import re
from datetime import datetime

# Default IMAP servers
DEFAULT_IMAP_SERVERS = {
    "gmail.com": "imap.gmail.com",
    "googlemail.com": "imap.gmail.com",
    "outlook.com": "outlook.office365.com",
    "hotmail.com": "outlook.office365.com",
    "live.com": "outlook.office365.com",
    "yahoo.com": "imap.mail.yahoo.com",
    "icloud.com": "imap.mail.me.com"
}

PROMOTIONAL_KEYWORDS = [
    "unsubscribe", "view in browser", "discount", "sale", "limited time offer",
    "special offer", "promo", "deal", "newsletter", "save up to", "exclusive deal",
    "marketing", "promotions", "shop now", "free shipping", "clearance", "advertisement"
]

FINANCIAL_PRIORITY_KEYWORDS = [
    "statement", "due date", "payment due", "bpi", "unionbank", "tonik", "uno bank",
    "pag-ibig", "salary", "payroll", "invoice", "receipt", "transaction alert",
    "security alert", "verification code", "otp", "billing", "bill"
]


def load_env_file():
    """Loads key-value pairs from .env in script directory."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().replace(" ", "")  # Strip internal spaces from app passwords
                    os.environ[k] = v


def decode_str(header_val):
    if not header_val:
        return ""
    decoded_parts = decode_header(header_val)
    result = []
    for part, enc in decoded_parts:
        if isinstance(part, bytes):
            try:
                result.append(part.decode(enc or "utf-8", errors="replace"))
            except Exception:
                result.append(part.decode("latin1", errors="replace"))
        else:
            result.append(str(part))
    return "".join(result)


def detect_imap_server(email_address):
    domain = email_address.split("@")[-1].lower() if "@" in email_address else ""
    return DEFAULT_IMAP_SERVERS.get(domain, "imap.gmail.com")


def connect_imap(username, password, server=None, port=993):
    if not server:
        server = detect_imap_server(username)
    # Strip whitespace from app password
    clean_pass = password.replace(" ", "").strip()
    print(f"[Hermes] Connecting to {server}:{port} as {username}...")
    mail = imaplib.IMAP4_SSL(server, port)
    mail.login(username, clean_pass)
    print(f"[Hermes] Authenticated successfully with {server}.")
    return mail


def triage_email_item(subject, sender, body_snippet, has_unsubscribe):
    full_text = f"{subject} {sender} {body_snippet}".lower()

    # 1. High Priority Financial / Security / Personal
    for kw in FINANCIAL_PRIORITY_KEYWORDS:
        if kw in full_text:
            return "VIP_PRIORITY"

    # 2. Promotional / Marketing / Spam Clutter
    if has_unsubscribe:
        return "PROMOTION_SPAM"

    for kw in PROMOTIONAL_KEYWORDS:
        if kw in full_text:
            return "PROMOTION_SPAM"

    # 3. Standard Personal / Direct Communication
    return "IMPORTANT_PERSONAL"


def fetch_and_triage(mail, folder="INBOX", limit=30):
    mail.select(folder)
    status, messages = mail.search(None, "ALL")
    if status != "OK" or not messages[0]:
        print("[Hermes] No messages found in folder.")
        return []

    msg_ids = messages[0].split()
    recent_ids = msg_ids[-limit:]
    recent_ids.reverse()

    results = []

    for mid in recent_ids:
        res, data = mail.fetch(mid, "(RFC822.HEADER)")
        if res != "OK":
            continue

        raw_header = data[0][1]
        msg = email.message_from_bytes(raw_header)

        subject = decode_str(msg.get("Subject", "(No Subject)"))
        sender = decode_str(msg.get("From", "(Unknown Sender)"))
        date_str = decode_str(msg.get("Date", ""))
        has_unsub = "List-Unsubscribe" in msg

        category = triage_email_item(subject, sender, "", has_unsub)

        results.append({
            "id": mid.decode("utf-8"),
            "sender": sender,
            "subject": subject,
            "date": date_str,
            "category": category,
            "has_unsubscribe": has_unsub
        })

    return results


def purge_spam_messages(mail, spam_ids, dry_run=True):
    """
    Moves identified spam/promotions to Trash.
    Dry run by default to prevent accidental data loss.
    """
    if not spam_ids:
        print("[Hermes] No promotional or spam messages to purge.")
        return 0

    if dry_run:
        print(f"[Hermes] [DRY RUN] {len(spam_ids)} messages flagged for Trash removal. Set dry_run=False to execute.")
        return len(spam_ids)

    # For Gmail IMAP: copy to [Gmail]/Trash or add \Trash flag
    count = 0
    for mid in spam_ids:
        try:
            # Gmail specific move to trash
            mail.copy(mid, "[Gmail]/Trash")
            mail.store(mid, "+FLAGS", "\\Deleted")
            count += 1
        except Exception as e:
            try:
                # Standard IMAP Trash
                mail.copy(mid, "Trash")
                mail.store(mid, "+FLAGS", "\\Deleted")
                count += 1
            except Exception as e2:
                print(f"[Hermes] Error moving message {mid} to Trash: {e2}")

    mail.expunge()
    print(f"[Hermes] Purged {count} promotional/spam messages to Trash.")
    return count


def generate_digest_markdown(results, output_path=None):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if not output_path:
        today = datetime.now().strftime("%Y-%m-%d")
        output_path = os.path.join(script_dir, f"daily-inbox-digest-{today}.md")

    vip_items = [r for r in results if r["category"] == "VIP_PRIORITY"]
    personal_items = [r for r in results if r["category"] == "IMPORTANT_PERSONAL"]
    clutter_items = [r for r in results if r["category"] == "PROMOTION_SPAM"]

    lines = [
        "---",
        f"title: Executive Inbox Digest — {datetime.now().strftime('%Y-%m-%d')}",
        "category: Communications",
        "triage_officer: Hermes (@email-manager)",
        f"date: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "tags: [inbox, triage, email, daily-digest]",
        "---",
        "",
        f"# Executive Inbox Digest — {datetime.now().strftime('%B %d, %Y')}",
        f"**Triage Officer:** Hermes (`@email-manager`), Executive Mail Secretary  ",
        f"**Total Scanned:** {len(results)} | **VIP/Actionable:** {len(vip_items) + len(personal_items)} | **Spam/Promotions:** {len(clutter_items)}  ",
        f"**Cross-References:** [[07-Inbox-and-Mail/inbox-management-protocol]], [[AGENTS]], [[00-Butler-Dashboard/status.json]]",
        "",
        "---",
        "",
        "## 🔴 VIP & Actionable Priority Emails"
    ]

    if not vip_items and not personal_items:
        lines.append("*No high-priority or personal action items requiring immediate attention.*")
    else:
        for item in vip_items + personal_items:
            tag = "🎯 [FINANCE/LEGAL]" if item["category"] == "VIP_PRIORITY" else "📩 [PERSONAL]"
            lines.append(f"* **{tag}** **From:** `{item['sender']}`  \n  **Subject:** {item['subject']}  \n  *Date:* {item['date']}")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 🗑️ Filtered Promotions & Spam Clutter (Targeted for Trash)")
    if not clutter_items:
        lines.append("*Inbox is clean; zero promotional clutter identified.*")
    else:
        lines.append(f"*{len(clutter_items)} messages flagged:*")
        for item in clutter_items[:20]:
            lines.append(f"* [🗑️ Purge] **From:** `{item['sender']}` — **Subject:** {item['subject']}")
        if len(clutter_items) > 20:
            lines.append(f"*... and {len(clutter_items) - 20} additional marketing emails.*")

    content = "\n".join(lines)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[Hermes] Digest authored at: {output_path}")
    return output_path


def run():
    load_env_file()
    username = os.environ.get("GMAIL_ADDRESS") or os.environ.get("EMAIL_USER")
    password = os.environ.get("GMAIL_APP_PASSWORD") or os.environ.get("EMAIL_PASS")

    if not username:
        print("[Hermes] Status: Awaiting Gmail Address.")
        print("Please provide the Gmail address to accompany the App Password.")
        return False

    if not password:
        print("[Hermes] Error: App password missing.")
        return False

    try:
        mail = connect_imap(username, password)
        results = fetch_and_triage(mail, limit=30)
        digest_file = generate_digest_markdown(results)
        print(f"[Hermes] Triage complete. Scan results recorded in {digest_file}.")
        mail.close()
        mail.logout()
        return True
    except Exception as e:
        print(f"[Hermes] Authentication/Connection Error: {e}")
        return False


if __name__ == "__main__":
    run()
