#!/bin/sh
# スマホの「器具写真の撮影」ページから GitHub の非公開リポジトリ kigu-photos に送られた写真を、Mac に取り込む
#   sh tools/pull_photos.sh
set -e
DIR="$HOME/Pictures/器具素材/raw"
if [ ! -d "$DIR/.git" ]; then
  git clone https://github.com/ehoannet-dev/kigu-photos.git "$DIR"
else
  git -C "$DIR" pull --ff-only
fi
echo "取り込み先: $DIR"
echo "器具ごとの枚数:"
n=0
for d in "$DIR"/*/; do
  [ -d "$d" ] || continue
  n=$((n + 1))
  printf "  %-16s %s 枚\n" "$(basename "$d")" "$(find "$d" -type f | wc -l | tr -d ' ')"
done
[ "$n" -eq 0 ] && echo "  （まだ写真はありません）"
exit 0
