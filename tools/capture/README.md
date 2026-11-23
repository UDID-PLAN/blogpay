# 화면 캡처 도구

관리자·쇼핑몰 화면을 저장한 HTML(`…_files/` 포함)에서 기획서용 PNG와 마커 좌표를 만든다. Chrome 필요(`CHROME_BIN`으로 경로 지정 가능).

```
node tools/capture/shot.mjs <html> <out.png> [pc|mobile] [높이px]    # 1920x1250 / 390x844 캡처 (PC는 높이 지정 가능)
node tools/capture/measure.mjs <html> '{"1":["#btn"],"2":["*.row"]}' [out.json] [높이px]   # 마커 좌표(%) → spec.json marks
```

- 선택자 앞 `*`는 일치하는 모든 요소를 하나의 박스로 묶는다.
- 좌표는 캡처 크기(기본 1920x1250) 기준 %이므로 `shot.mjs` PC 캡처와 같은 이미지에만 쓴다. 긴 화면은 두 도구에 같은 높이를 준다.
- `examples/`는 스마트스토어 연동 건에서 쓴 **가공 스크립트 예시**(Python+BeautifulSoup, `pip install beautifulsoup4`)다. 개인정보 마스킹, 알림창·모달 상태 주입 방식을 참고해 요청 건마다 복사해 수정한다. 파일명이 `cust_*.py`일 때 입력 HTML 파일명은 스크립트 안에 하드코딩되어 있으니 확인 후 쓴다.
