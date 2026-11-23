"""외부판매채널 연동(연동설정) 화면 가공 예시 — PRO / BASIC 관리자 '외부서비스 연동' 페이지를 베이스로 쓴다.
사용: python3 cust_setting.py <pro|basic> <disconnected|connected|alert-disconnect|alert-update|alert-save>
입력: <pro|basic>/블로그페이 관리자.html (+ 같은 폴더의 '블로그페이 관리자_files/')
출력: <pro|basic>/out_<state>.html  (shot.mjs / measure.mjs 로 캡처·측정)
"""
import sys
from bs4 import BeautifulSoup

plat, state = sys.argv[1], sys.argv[2]
soup = BeautifulSoup(open(f'{plat}/블로그페이 관리자.html', encoding='utf8').read(), 'html.parser')
H = lambda h: BeautifulSoup(h, 'html.parser')
for s in soup.find_all('script'):
    s.decompose()
connected = state != 'disconnected'

GUIDE1 = ('- 스마트스토어 연동은 네이버 커머스API 대행사 지정이 필요합니다. 스마트스토어센터에서 API 대행사를 「블로그페이」로 지정한 뒤 연결해 주세요.<br>'
          '- 연결 후 상품정보 수정 기준은 블로그페이입니다. 스마트스토어에서 직접 수정한 내용은 쇼핑몰에 반영되지 않습니다.')
GUIDE2 = ('- 상품 내보내기, 상품 가져오기 시 전체 상품에 공통으로 적용되는 정보입니다. <strong style="color:#eb2026">상품 연동 전에 먼저 설정해 주세요.</strong><br>'
          '- 스마트스토어에서 가져온 상품에도 공통 정보가 적용되며, 이후 상품 내보내기 시 스마트스토어에 반영됩니다.')
HELP1 = '스마트스토어 주소(smartstore.naver.com/) 뒤에 오는 ID만 입력해 주세요.'
HELP2 = '스마트스토어센터 &gt; 판매자정보 &gt; API 연동용 판매자 ID에서 확인할 수 있습니다.'
ADDR = ('<div id="@@ID@@" style="border:1px solid #ddd;padding:8px 10px;margin-top:6px;line-height:1.8"><b>주소 :</b> (08389) 서울 구로구 디지털로26길 61 (구로동, 에이스하이엔드타워2차) 1202, 1203호<br>'
        '<b>연락처 :</b> 010-1234-1234 010-1234-1234</div>')
SEL = lambda t, w='100%': '<select class="form-control input-sm" style="width:%s !important;display:inline-block"><option>%s</option></select>' % (w, t)
CAL = "background:#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23777' stroke-width='1.5'%3E%3Crect x='3' y='4' width='14' height='13' rx='1'/%3E%3Cpath d='M3 8h14M7 2v4M13 2v4'/%3E%3C/svg%3E\") no-repeat right 8px center/16px !important"
DATE = lambda w='240px': '<input type="text" class="form-control input-sm jqueryui-date hasDatepicker" style="width:%s;display:inline-block;%s" value="">' % (w, CAL.replace('"', "'"))
INP = lambda v='', w='200px', ph='': '<input type="text" class="form-control input-sm" style="width:%s;display:inline-block" value="%s" placeholder="%s">' % (w, v, ph)

# ───────── 공통 ─────────
soup.head.append(H('<style>input[type=radio]{-webkit-appearance:radio !important;appearance:auto !important;opacity:1 !important;position:static !important;width:14px;height:14px;display:inline-block !important;vertical-align:middle;margin:0 4px 0 0 !important}</style>'))
def alert_overlay(msg, cancel):
    css = ('<style>#nAlert{position:fixed;top:24px;left:50%;margin-left:-180px;width:360px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.35);padding:24px 24px 20px;z-index:99999;transform:scale(1.4);transform-origin:top center;font-family:Pretendard,"Noto Sans KR",sans-serif;color:#1f1f1f}'
           '#nAlert h4{margin:0 0 12px;font-size:16px;font-weight:400}#nAlert p{margin:0;font-size:14px;line-height:20px}#nAlert .b{display:flex;justify-content:flex-end;gap:8px;margin-top:22px}'
           '#nAlert .b span{display:inline-block;padding:10px 24px;border-radius:999px;background:#2f5a8f;color:#fff;font-size:14px}#nAlert .b span.ok{box-shadow:0 0 0 2px #fff,0 0 0 4px #2f5a8f}'
           '#nAlert .b span.c{background:#e8eef6;color:#2f5a8f}</style>')
    btn = '<span class="ok">확인</span>' + ('<span class="c">취소</span>' if cancel else '')
    soup.head.append(H(css))
    soup.body.append(H('<div id="nAlert"><h4>sample.shop.blogpay.co.kr 내용:</h4><p>%s</p><div class="b">%s</div></div>' % (msg, btn)))

ALERTS = {
    'alert-disconnect': ('연결을 해제하시겠습니까?<br>상품 연동이 즉시 중단되며, 스마트스토어 전송이 필요한 처리는 불가능합니다.', True),
    'alert-update': ('스마트스토어 판매자 정보를 불러오시겠습니까?<br>주소록을 포함한 판매자 정보가 최신 정보로 업데이트됩니다.', True),
    'alert-save': ('저장되었습니다.<br>변경된 내용은 상품 내보내기를 다시 실행해야 최신 정보가 반영됩니다.', False),
}

# ───────── PRO ─────────
def pro():
    main = soup.select_one('.main.clearfix')
    main.select_one('h2.page-header .pull-left').string = '외부판매채널 연동'
    for e in list(main.children):
        if getattr(e, 'name', None) and e.name != 'h2':
            e.decompose()
    # LNB: 외부서비스 연동 → 비활성, 외부판매채널 연동 추가
    for act in [soup.select_one('ul.sub_menu li.active ul li.active'), soup.select_one('ul.service-menu li.active')]:
        act['class'] = [c for c in act.get('class', []) if c != 'active']
        act.insert_after(H('<li class="active"><a href="#">외부판매채널 연동</a></li>'))
    rows = ('<tr><th class="text-center" style="width:15%%">스마트스토어 URL ID</th><td>%s <span class="ml10">%s</span></td></tr>'
            '<tr><th class="text-center">API 연동용 판매자 ID</th><td>%s <span class="ml10">%s</span></td></tr>') % (
        INP('samplestore' if connected else '', '200px', '' if connected else '예) samplestore ID'), HELP1,
        INP('ncp_1a2b3c4d5e' if connected else '', '200px', '' if connected else '예) ncp_1a2b3c4d5e'), HELP2)
    if connected:
        rows = rows.replace('<input ', '<input disabled ')
    body = '<div class="alert alert-warning" style="line-height:1.9;margin-bottom:0">%s</div><div style="height:22px"></div>' % GUIDE1
    body += '<table class="table table-bordered" id="linkTb"><tbody>%s</tbody></table>' % rows
    if not connected:
        body += '<div style="margin-top:18px"><a class="btn btn-primary btn-sm" id="connBtn">연결하기</a></div>'
    else:
        body += '<div id="actBtns" style="padding:22px 0 0"><a class="btn btn-default btn-sm" id="disBtn">연결 해제</a> <a class="btn btn-default btn-sm ml5" id="updBtn">판매자정보 업데이트</a></div><div style="height:60px"></div>'
        body += '<div class="alert alert-warning" style="line-height:1.9;margin:0" id="commonGuide">%s</div><div style="height:22px"></div>' % GUIDE2
        body += ('<table class="table table-bordered" id="commonTb"><colgroup><col style="width:15%%"><col></colgroup><tbody>'
                 '<tr><th class="text-center">오늘출발 설정</th><td><table class="table table-bordered" style="margin:0"><colgroup><col style="width:140px"><col></colgroup><tbody>'
                 '<tr><th class="text-center">기준시간 *</th><td>평일 %s : %s 까지 결제 완료</td></tr>'
                 '<tr><th class="text-center">휴무요일</th><td>%s</td></tr>'
                 '<tr><th class="text-center">휴무일</th><td>%s</td></tr></tbody></table></td></tr>'
                 '<tr><th class="text-center">반품/교환 정보</th><td><table class="table table-bordered" style="margin:0"><colgroup><col style="width:140px"><col style="width:30%%"><col style="width:140px"><col></colgroup><tbody>'
                 '<tr><th class="text-center">반품 택배사 *</th><td colspan="3">%s</td></tr>'
                 '<tr><th class="text-center">반품 배송비(편도) *</th><td>%s 원</td><th class="text-center">교환 배송비(왕복) *</th><td>%s 원</td></tr>'
                 '<tr><th class="text-center">반품안심케어</th><td colspan="3"><label class="radio-inline"><input type="radio" name="care"> 설정함</label> <label class="radio-inline"><input type="radio" name="care" checked> 설정안함</label></td></tr>'
                 '<tr><th class="text-center">반품·교환지 *</th><td colspan="3">%s%s</td></tr></tbody></table></td></tr>'
                 '<tr><th class="text-center">A/S 정보</th><td><table class="table table-bordered" style="margin:0"><colgroup><col style="width:140px"><col></colgroup><tbody>'
                 '<tr><th class="text-center">A/S 전화번호 *</th><td>%s</td></tr><tr><th class="text-center">A/S 안내문구 *</th><td>%s</td></tr></tbody></table></td></tr>'
                 '<tr><th class="text-center">방문수령지 *</th><td>%s%s</td></tr>'
                 '<tr><th class="text-center">출고지 *</th><td>%s%s</td></tr></tbody></table>') % (
            SEL('6시~23시 중 택 1', '180px'), SEL('00분 / 30분 중 택 1', '180px'), SEL('월 / 화 / 수 / 목 / 금 중 택 1', '240px'), DATE('240px'),
            SEL('한진택배', '240px'), INP('', '160px'), INP('', '160px'),
            SEL('주소록 이름', '100%'), ADDR.replace('@@ID@@', 'addr1'),
            INP('', '200px'), INP('', '100%'),
            SEL('주소록 이름', '100%'), ADDR.replace('@@ID@@', 'addr2'), SEL('주소록 이름', '100%'), ADDR.replace('@@ID@@', 'addr3'))
    card = ('<div class="table-wrap" id="linkCard"><table class="table table-bordered"><tbody><tr><td><div class="down-wrap"><span class="sec-tit">네이버 스마트스토어 연동</span>'
            '<div class="float_r"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#6b7280" stroke-width="2"><path d="M5 12l5-5 5 5"/></svg></div></div></td></tr><tr><td class="table-pt10 table-pb10">%s</td></tr></tbody></table></div>') % body
    main.append(H(card))
    if connected:
        main.append(H('<div class="mgt20 center" style="text-align:center;margin:20px 0 60px"><a class="btn btn-primary btn-lg" id="saveBtn">저장</a></div>'))

# ───────── BASIC ─────────
def basic():
    wrap = soup.select_one('.basic-wrap.basic-sub')
    wrap.find('h2').string = '외부판매채널 연동'
    act = soup.select_one('li.eos-item-active')
    act['class'] = ['eos-item']
    act.insert_after(H('<li class="eos-item eos-item-active"><a href="#">외부판매채널 연동</a></li>'))
    sub = wrap.select_one('.sub-wrap')
    sub.clear()
    sel = lambda t: '<select style="width:100%%"><option>%s</option></select>' % t
    inp = lambda v='', ph='', d=False: '<input type="text" value="%s" placeholder="%s"%s>' % (v, ph, ' disabled' if d else '')
    row = lambda label, inner: '<div class="cont-wrap w60"><div class="col-xs-3 txt-left">%s</div><div class="col-xs-9">%s</div></div>' % (label, inner)
    hint = lambda t: '<p class="gray" style="margin:6px 0 0;font-size:13px">%s</p>' % t
    tab = lambda a, b: '<div class="tab"><ul class="w100"><li class="active"><a href="javascript:;">%s</a></li><li><a href="javascript:;">%s</a></li></ul></div>' % (a, b)
    sec = lambda title, inner, i: ('<div class="atc-section"><h3 class="atc-toggle open" data-menunum="%d">%s<div class="col-xs-9 f-right t-right"><div class="arrow"></div></div></h3>'
                                    '<div id="contbox_%d">%s</div></div>') % (i, title, i, inner)
    g = lambda t: '<div class="atc-txt-lst" id="%s"><ul><li>%s</li></ul></div>'
    link = '<div class="atc-txt-lst"><ul><li>%s</li></ul></div>' % GUIDE1.replace('- ','').replace('<br>', '</li><li>')
    body = row('스마트스토어 URL ID', inp('samplestore' if connected else '', '' if connected else '예) samplestore ID', connected) + hint(HELP1))
    body += row('API 연동용 판매자 ID', inp('ncp_1a2b3c4d5e' if connected else '', '' if connected else '예) ncp_1a2b3c4d5e', connected) + hint(HELP2))
    btns = ('<a class="btn btn-sm btn-outline-blue" id="disBtn">연결 해제</a> <a class="btn btn-sm btn-outline-blue ml5" id="updBtn">판매자정보 업데이트</a>' if connected
            else '<a class="btn btn-blue btn-sm" id="connBtn">연결하기</a>')
    body += '<div class="cont-wrap w60" id="actBtns" style="margin:20px 0 30px"><div class="col-xs-3"></div><div class="col-xs-9">%s</div></div>' % btns
    html = sec('네이버 스마트스토어 연동', link + '<div class="contbox">%s</div>' % body, 1)
    if connected:
        guide2 = '<div class="atc-txt-lst" id="commonGuide"><ul><li>%s</li></ul></div>' % GUIDE2.replace('- ','').replace('<br>', '</li><li>')
        c = row('오늘출발 · 기준시간 *', '<div style="display:flex;gap:8px;align-items:center;white-space:nowrap"><span>평일</span><div style="flex:1">%s</div><span>:</span><div style="flex:1">%s</div><span>까지 결제 완료</span></div>' % (sel('6시~23시 중 택 1'), sel('00분 / 30분 중 택 1')))
        c += row('오늘출발 · 휴무요일', sel('월 / 화 / 수 / 목 / 금 중 택 1'))
        c += row('오늘출발 · 휴무일', '<input type="text" class="jqueryui-date hasDatepicker" style="%s" value="">' % CAL.replace('"', "'"))
        c += row('반품 택배사 *', sel('한진택배'))
        c += row('반품 배송비(편도) *', inp() )
        c += row('교환 배송비(왕복) *', inp())
        c += row('반품안심케어', tab('설정함', '설정안함').replace('<li class="active"><a href="javascript:;">설정함', '<li><a href="javascript:;">설정함').replace('<li><a href="javascript:;">설정안함', '<li class="active"><a href="javascript:;">설정안함'))
        c += row('반품·교환지 *', sel('주소록 이름') + ADDR.replace('@@ID@@', 'addr1'))
        c += row('A/S 전화번호 *', inp())
        c += row('A/S 안내문구 *', inp())
        c += row('방문수령지 *', sel('주소록 이름') + ADDR.replace('@@ID@@', 'addr2'))
        c += row('출고지 *', sel('주소록 이름') + ADDR.replace('@@ID@@', 'addr3'))
        html += sec('공통 정보 설정', guide2 + '<div class="contbox">%s</div>' % c, 2)
    sub.append(H('<form id="snsConnectForm">%s</form>' % html))
    if connected:
        sub.append(H('<div class="bot-btn-area"><a class="btn btn-blue btn-xl" id="saveBtn">저장</a></div>'))

ARROW = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6' fill='none' stroke='%23333' stroke-width='1.4'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E\")"
if plat == 'basic':
    soup.head.append(H('<style>select{background-color:#fff !important;background-image:%s !important;background-repeat:no-repeat !important;background-position:right 17px center !important;background-size:10px auto !important;-webkit-appearance:none !important;appearance:none !important}</style>' % ARROW))
(pro if plat == 'pro' else basic)()
if state in ALERTS:
    alert_overlay(*ALERTS[state])
open(f'{plat}/out_{state}.html', 'w', encoding='utf8').write(str(soup))
print(f'{plat}/out_{state}.html')
