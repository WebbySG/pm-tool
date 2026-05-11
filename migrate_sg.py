#!/usr/bin/env python3
"""
Migrate PostgreSQL data from Tokyo Supabase to Singapore Supabase.
Run on the VPS: python3 migrate_sg.py
"""
import subprocess, urllib.parse, sys, os

# --- Tokyo (source) ---
TOKYO_HOST = "db.grwstdksvisvrvunvpij.supabase.co"
TOKYO_PW   = """&Vthi"O;N"6:xh@2vq490"0^_'/3m4LZOozr89)£ivH19o)~/y"""
TOKYO_USER = "postgres"
TOKYO_DB   = "postgres"

# --- Singapore (destination) ---
SG_REF     = "tfhzuruaaymfhqmeiusr"
SG_PW      = """&Vthi"O;N"6:xh@2vq490"0^_'/2m4LZOozr89)£ivH19o)~/y"""
SG_USER    = "postgres"
SG_DB      = "postgres"

# Singapore connection candidates (tried in order)
SG_HOSTS = [
    # Direct connection
    (f"db.{SG_REF}.supabase.co", 5432, SG_USER),
    # Session pooler
    ("aws-0-ap-southeast-1.pooler.supabase.com", 5432, f"postgres.{SG_REF}"),
    # Transaction pooler
    ("aws-0-ap-southeast-1.pooler.supabase.com", 6543, f"postgres.{SG_REF}"),
]

DUMP_FILE = "/tmp/tokyo_dump.sql"


def make_url(host, port, user, pw, db):
    return (
        f"postgresql://{urllib.parse.quote(user, safe='')}:"
        f"{urllib.parse.quote(pw, safe='')}@{host}:{port}/{db}"
    )


def run(cmd, label):
    print(f"\n[{label}] Running...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[{label}] FAILED:\n{result.stderr[:2000]}")
        return False
    print(f"[{label}] OK")
    return True


def test_connection(url, label):
    ok = run(
        ["psql", url, "-c", "SELECT 1;"],
        f"TEST {label}"
    )
    return ok


# ── Step 1: dump from Tokyo ──────────────────────────────────────────────────
tokyo_url = make_url(TOKYO_HOST, 5432, TOKYO_USER, TOKYO_PW, TOKYO_DB)

if not test_connection(tokyo_url, "Tokyo"):
    print("Cannot connect to Tokyo — aborting.")
    sys.exit(1)

if os.path.exists(DUMP_FILE):
    print(f"\nDump file already exists at {DUMP_FILE}, skipping dump.")
else:
    ok = run(
        [
            "pg_dump",
            "--no-owner",
            "--no-acl",
            "--schema=public",
            "--schema=storage",
            "--schema=auth",
            "-f", DUMP_FILE,
            tokyo_url,
        ],
        "pg_dump Tokyo",
    )
    if not ok:
        # Try public schema only
        ok = run(
            [
                "pg_dump",
                "--no-owner",
                "--no-acl",
                "--schema=public",
                "-f", DUMP_FILE,
                tokyo_url,
            ],
            "pg_dump Tokyo (public only)",
        )
    if not ok:
        print("Dump failed — aborting.")
        sys.exit(1)

dump_size = os.path.getsize(DUMP_FILE)
print(f"\nDump size: {dump_size // 1024} KB")

# ── Step 2: find working Singapore connection ────────────────────────────────
sg_url = None
for host, port, user in SG_HOSTS:
    url = make_url(host, port, user, SG_PW, SG_DB)
    if test_connection(url, f"SG {host}:{port}"):
        sg_url = url
        print(f"\nUsing Singapore connection: {host}:{port}")
        break

if not sg_url:
    print("\nAll Singapore connection attempts failed.")
    print("Please check:")
    print("  1. The DB password is correct (Settings → Database in Supabase dashboard)")
    print("  2. The project is fully provisioned (should show green in dashboard)")
    sys.exit(1)

# ── Step 3: restore to Singapore ─────────────────────────────────────────────
ok = run(
    ["psql", sg_url, "-f", DUMP_FILE],
    "psql restore to Singapore",
)

if ok:
    print("\n✓ Migration complete!")
    print(f"\nNext steps:")
    print(f"  1. Update /var/www/pm-tool/.env.local:")
    print(f"     NEXT_PUBLIC_SUPABASE_URL=https://{SG_REF}.supabase.co")
    print(f"     NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-sg-anon-key>")
    print(f"  2. Restart: pm2 restart pm-tool")
    print(f"  3. Create your admin user in Supabase dashboard → Authentication")
else:
    print("\nRestore failed. The dump is at /tmp/tokyo_dump.sql — check errors above.")
