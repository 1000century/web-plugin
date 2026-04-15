#!/bin/bash
# 아이콘 생성 스크립트 (ImageMagick 필요: sudo apt install imagemagick)
# 실행: bash icons/generate_icons.sh

for SIZE in 16 48 128; do
  convert -size ${SIZE}x${SIZE} \
    -background "#3a3aff" \
    -fill white \
    -gravity Center \
    -font DejaVu-Sans-Bold \
    -pointsize $((SIZE / 2)) \
    label:"Q" \
    icons/icon${SIZE}.png
  echo "생성됨: icons/icon${SIZE}.png"
done
