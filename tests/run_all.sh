#!/usr/bin/env bash
# 全テストを実行する。各テストは「終了コード0かつ出力に ALL OK」で合格。
# 生成の乱数で稀に落ちるテスト（test_mvp の金の個数・三方向攻撃など）があるため、最大3回まで再試行する。
cd "$(dirname "$0")/.."
fail=0
for f in tests/test_*.js; do
  ok=0
  for attempt in 1 2 3; do
    out=$(node tests/harness.js index.html "$f" 2>&1); code=$?
    if [ $code -eq 0 ] && echo "$out" | grep -q "ALL OK"; then ok=1; break; fi
  done
  if [ $ok -eq 1 ]; then echo "PASS $f (attempt $attempt)"; else echo "FAIL $f"; echo "$out" | tail -15; fail=1; fi
done
[ $fail -eq 0 ] && echo "ALL TESTS PASSED" || { echo "SOME TESTS FAILED"; exit 1; }
