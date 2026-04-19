#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") [mode] [options]

Query Application Insights for Vector Playground usage stats.

Modes:
  (default)       Summary dashboard (requests, top phrases, models, errors)
  --phrases       Most compared phrase pairs
  --models        Embedding model usage breakdown
  --errors        Recent failed requests
  --traffic       Request volume by hour

Options:
  --timespan <d>  KQL ago() duration (default: 1d). Examples: 1h, 7d, 30d
  --subscription  Azure subscription ID or name
  -h, --help      Show this help message

Examples:
  $(basename "$0")                        # Last 24h summary
  $(basename "$0") --phrases              # Top phrase pairs
  $(basename "$0") --timespan 7d          # Last 7 days summary
  $(basename "$0") --traffic --timespan 6h  # Last 6h traffic
EOF
  exit 0
}

MODE="summary"
TIMESPAN="1d"
SUBSCRIPTION="EffAz-Prod"
APP_INSIGHTS="appi-vectorplayground"
RG="rg-vectorplayground"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --phrases) MODE="phrases"; shift ;;
    --models) MODE="models"; shift ;;
    --errors) MODE="errors"; shift ;;
    --traffic) MODE="traffic"; shift ;;
    --timespan) TIMESPAN="$2"; shift 2 ;;
    --subscription) SUBSCRIPTION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

log_info()  { echo "ℹ️  $*"; }
log_error() { echo "❌ $*"; }

command -v az >/dev/null 2>&1 || { echo "Azure CLI (az) is required"; exit 1; }

# Timespan filter injected into every KQL query
TIME_FILTER="where timestamp > ago($TIMESPAN)"

query_ai() {
  local kql="$1"
  local result
  result=$(az monitor app-insights query \
    --app "$APP_INSIGHTS" \
    --resource-group "$RG" \
    --subscription "$SUBSCRIPTION" \
    --analytics-query "$kql" \
    -o json 2>&1) || {
    log_error "Query failed: $result"
    return 1
  }
  echo "$result"
}

format_table() {
  python3 -c "
import sys, json

data = json.load(sys.stdin)
tables = data.get('tables', [])
if not tables or not tables[0].get('rows'):
    print('  (no data)')
    sys.exit(0)

cols = [c['name'] for c in tables[0]['columns']]
rows = tables[0]['rows']

# Calculate column widths
widths = [len(c) for c in cols]
for row in rows:
    for i, val in enumerate(row):
        widths[i] = max(widths[i], len(str(val) if val is not None else ''))

# Print header
header = '  '.join(c.ljust(widths[i]) for i, c in enumerate(cols))
print(header)
print('  '.join('-' * w for w in widths))

# Print rows
for row in rows:
    line = '  '.join(str(v if v is not None else '').ljust(widths[i]) for i, v in enumerate(row))
    print(line)
"
}

log_info "Timespan: last $TIMESPAN"
echo ""

case "$MODE" in
  summary)
    log_info "Request summary"
    query_ai "
      requests
      | $TIME_FILTER
      | summarize total=count(), errors=countif(success==false), avg_ms=round(avg(duration),0) by name
      | order by total desc
    " | format_table

    echo ""
    log_info "Top 10 phrase comparisons"
    query_ai "
      traces
      | $TIME_FILTER
      | where message startswith 'Comparing'
      | parse message with \"Comparing '\" p1 \"' and '\" p2 \"' using \" model
      | summarize count=count() by p1, p2
      | order by count desc
      | take 10
    " | format_table

    echo ""
    log_info "Model usage"
    query_ai "
      traces
      | $TIME_FILTER
      | where message startswith 'Comparing'
      | parse message with \"Comparing '\" p1 \"' and '\" p2 \"' using \" model
      | summarize count=count() by model
      | order by count desc
    " | format_table
    ;;

  phrases)
    log_info "Top phrase comparisons"
    query_ai "
      traces
      | $TIME_FILTER
      | where message startswith 'Comparing'
      | parse message with \"Comparing '\" p1 \"' and '\" p2 \"' using \" model
      | summarize count=count() by p1, p2, model
      | order by count desc
      | take 20
    " | format_table
    ;;

  models)
    log_info "Embedding model usage"
    query_ai "
      traces
      | $TIME_FILTER
      | where message startswith 'Comparing'
      | parse message with \"Comparing '\" p1 \"' and '\" p2 \"' using \" model
      | join kind=inner (
          requests
          | $TIME_FILTER
          | where name == 'ComparePhrases'
          | project operation_Id, duration
        ) on operation_Id
      | summarize requests=count(), avg_ms=round(avg(duration),0), p95_ms=round(percentile(duration,95),0) by model
      | order by requests desc
    " | format_table
    ;;

  errors)
    log_info "Recent errors"
    query_ai "
      requests
      | $TIME_FILTER
      | where success == false
      | order by timestamp desc
      | project timestamp, name, resultCode, duration=round(duration,0)
      | take 20
    " | format_table
    ;;

  traffic)
    log_info "Request volume by hour"
    query_ai "
      requests
      | $TIME_FILTER
      | summarize requests=count(), errors=countif(success==false) by bin(timestamp, 1h)
      | order by timestamp desc
      | take 24
    " | format_table
    ;;
esac
