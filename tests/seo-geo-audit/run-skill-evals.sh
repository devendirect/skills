#!/usr/bin/env bash
# Level 2: runs the full skill, headless, on fixture copies, one after the other.
#
# Usage: bash run-skill-evals.sh [fixture name ...]     (default: all fixtures)
#
# Needs the Claude Code CLI (`claude`), Node 18+ and bash (Git Bash on Windows).
# Each fixture is copied to a fresh folder without expected.* and fixture.json,
# with this repo's skill installed in it as "seo-geo-audit-under-test" (so it
# cannot be confused with a globally installed seo-geo-audit). The fixture's
# server runs during its audit. Results: the copies' docs/seo/ folders, to be
# scored by hand against each expected.md.
#
# Each audit costs real usage (about 4-5 minutes each on 2026-10-03). The run
# stops cleanly if the usage limit is reached; finished audits stay complete.
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
skill="$here/../../plugins/seo-geo-audit/skills/seo-geo-audit"
out="${TMPDIR:-/tmp}/seo-geo-audit-evals/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$out"

# Shell tools must be allowed, PowerShell included: on Windows the model often
# runs the scripts through it, and a denied call means no live checks at all.
tools="Bash PowerShell Read Write Edit Glob Grep WebFetch WebSearch Skill"

prompt='/seo-geo-audit-under-test

This is a non-interactive run: nobody can answer questions. Use the default plans folder docs/seo/ and proceed without asking. When a decision belongs to the user, present it in the plans as the skill says.'

if [ "$#" -gt 0 ]; then names=("$@"); else names=($(ls "$here/fixtures")); fi

for name in "${names[@]}"; do
  src="$here/fixtures/$name"
  [ -d "$src" ] || { echo "skip: no fixture $name"; continue; }
  dest="$out/$name"
  cp -r "$src" "$dest"
  rm -f "$dest/expected.md" "$dest/expected.json" "$dest/fixture.json"
  mkdir -p "$dest/.claude/skills"
  cp -r "$skill" "$dest/.claude/skills/seo-geo-audit-under-test"
  sed -i 's/^name: seo-geo-audit$/name: seo-geo-audit-under-test/' "$dest/.claude/skills/seo-geo-audit-under-test/SKILL.md"

  port="$(node -e 'const c=require(process.argv[1]);process.stdout.write(String(c.port??""))' "$src/fixture.json")"
  server=""
  if [ -n "$port" ] && [ "$port" != "null" ]; then
    node "$here/serve.mjs" "$name" >/dev/null &
    server=$!
    for _ in $(seq 50); do curl -s -o /dev/null "http://localhost:$port/" && break; sleep 0.2; done
  fi

  echo "== $name"
  start=$(date +%s)
  (cd "$dest" && claude -p "$prompt" --output-format json --permission-mode acceptEdits --allowedTools "$tools" \
    > "$out/log-$name.json" 2> "$out/log-$name.err")
  code=$?
  [ -n "$server" ] && kill "$server" 2>/dev/null

  summary="$(node -e '
    const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const denied = (r.permission_denials || []).length;
    console.log(`${r.num_turns} turns, $${(r.total_cost_usd ?? 0).toFixed(2)}, ${denied} permission denial(s)`);
  ' "$out/log-$name.json" 2>/dev/null || echo "no JSON result")"
  echo "   exit $code, $(( $(date +%s) - start )) s, $summary"
  echo "   plans: $dest/docs/seo/"

  if grep -q "session limit\|usage limit" "$out/log-$name.json" 2>/dev/null; then
    echo "Usage limit reached during $name: stopping. Re-run the remaining fixtures after the reset."
    exit 1
  fi
done

echo
echo "Done. Score each docs/seo/ folder in $out against fixtures/<name>/expected.md."
