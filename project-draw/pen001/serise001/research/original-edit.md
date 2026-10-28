# 원본 편집본과 이미지 도구 기록

- 입력: `../art/base.png` (소장품 사진 원본은 보존).
- 출력: [original-procession-cutout.png](../art/original-procession-cutout.png), 1553×1013 RGBA.
- 도구: **built-in imagegen**. CLI/API 대체 경로를 쓰지 않았다.
- 용도: 바깥 검은 액자선, 배경 종이, 주변 글씨와 인장을 제거한 영상 오버랩용 투명 편집본. 이미지 모델을 통한 배경제거 편집 결과이며 원본 무편집 스캔 파일과는 구분한다.
- 인물과 상여를 유지하도록 요청했다. 프레이밍은 `../art/original-outro.json`의 crop·placement로 그린 그림의 구도에 맞춘다. 원본 사진은 플레이어의 ‘원본과 비교’에서 그대로 볼 수 있다.

## 사용한 프롬프트

```text
Use case: background-extraction. Edit target: the provided original historical Korean genre painting scan. Produce an archival faithful cutout of ONLY the complete original funeral/bier procession: the straw-covered wooden bier, long wooden pole and all NINE original people, clothes, hats, faces, hands and feet. Remove the entire dark outer photographic frame/border, the cream paper background, the French handwritten caption above, the vertical handwritten inscription at upper right, the two red seals at lower left, all edge artifacts. Make all removed background genuinely transparent (alpha), no white rectangle, no vignette. CRITICAL: Do NOT redraw or restyle or modernize or simplify any part of the original procession; retain the exact original scanned brush lines, original low-resolution detail, colors, expressions, poses, each silhouette and relative positions. Do NOT remove the painted dark outlines within the people or bier: the requested removed outline is the outer rectangular photo frame only. Keep the same landscape canvas aspect ratio and the subjects at the same proportional coordinates within the full original canvas, no tight crop and no rearrangement. Maintain all nine people including obscured rear heads and both colored-clothes women. This is background removal of an existing artwork for a cross-dissolve, not a newly generated reinterpretation.
```
