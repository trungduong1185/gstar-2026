#!/usr/bin/env bash
set -euo pipefail

if [[ -f /opt/rh/gcc-toolset-12/enable ]]; then
  # CentOS 8 ships GCC 8, while better-sqlite3 requires C++20 when built locally.
  source /opt/rh/gcc-toolset-12/enable
fi

if [[ -x /usr/bin/python3.11 ]]; then
  export npm_config_python=/usr/bin/python3.11
fi

npm ci
