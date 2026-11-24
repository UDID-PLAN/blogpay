#!/usr/bin/env python3
"""Meta 카탈로그 피드URL 설정 화면 상태 가공 (v1.0)
입력: admin/sns_connect.html (외부서비스 연동 저장 HTML, 개인정보 마스킹본)
출력: build/<state>.html → tools/capture/shot.mjs로 캡처
상태: PRO on/off/wait/modal, BASIC b-on/b-off/b-wait (admin-basic/sns_connect.html)
사용: python3 build.py [state ...]
"""
import re, sys, pathlib
BASE = pathlib.Path(__file__).parent
SRC = BASE / 'admin' / 'sns_connect.html'
OUT = BASE / 'admin'
CHEV_UP = "data:image/svg+xml;utf8," + (
    "<svg xmlns='http://www.w3.org/2000/svg' width='34' height='34' viewBox='0 0 34 34'>"
    "<rect x='0.5' y='0.5' width='33' height='33' rx='6' fill='white' stroke='%23cbd5e1'/>"
    "<path d='M11 20l6-6 6 6' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>")
CHEV_DOWN = CHEV_UP.replace("M11 20l6-6 6 6", "M11 14l6 6 6-6")
FEED_URL = 'https://sample.shop.blogpay.co.kr/metaFeedUrl'

CSS = """
<style id="mockfix">
input[type=radio]{-webkit-appearance:radio!important;appearance:auto!important;opacity:1!important;position:static!important;
  width:14px!important;height:14px!important;display:inline-block!important;margin:0 5px 0 0!important;visibility:visible!important}
#metaHelp .help-intro{padding:30px 20px 10px}
#metaHelp .help-intro h3{font-size:24px;font-weight:700;margin:0 0 14px;position:relative;padding-top:22px}
#metaHelp .help-intro h3:before{content:'';position:absolute;top:0;left:50%;width:34px;margin-left:-17px;border-top:2px solid #212121}
#metaHelp .help-intro p{font-size:13px;color:#555;margin:0 0 2px}
#metaHelp .help-intro p.red{color:#ff0000;font-weight:700}
#metaHelp .modal-body-box img{width:92%;border:1px solid #cfcfcf}
</style>
"""


def block(state):
    on = state != 'off'
    rows = ''
    if on:
        val = '' if state == 'wait' else FEED_URL
        ph = '피드URL 경로를 생성하고 있습니다. (최대 하루까지 소요)' if state == 'wait' else ''
        rows = f'''
                                <tr id="metaUrlTr">
                                    <th class="text-center">피드URL 경로</th>
                                    <td>
                                        <div class="col-xs-6 pd-none">
                                            <input type="text" class="form-control" id="metaFeedUrl" value="{val}" placeholder="{ph}" readonly="">
                                        </div>
                                        <a href="javascript:void(0);" class="btn btn-sm btn-secondary ml5" id="metaDomainBtn">도메인 변경</a>
                                    </td>
                                </tr>'''
    return f'''
    <div class="table-wrap" id="metaFeedWrap">
        <form method="post" name="metaForm" id="metaForm">
            <table class="table table-bordered">
                <tbody><tr>
                    <td>
                        <div class="down-wrap btnDownWrap active" id="metaHead">
                            <span class="sec-tit">Meta 카탈로그 피드URL 설정</span>
                            <div class="float_r"><span class="sec-txt" id="metaInfo">{'사용' if on else '사용안함'}</span>
                                <img src="{CHEV_UP}" alt="" id="metaImg">
                            </div>
                        </div>
                    </td>
                </tr>
                <tr id="meta_Tr">
                    <td class="table-pt10 table-pb10">
                        <div class="alert alert-warning mb20" role="alert" id="metaGuide">
                            <p><span class="red">인스타그램 상품 태그, 페이스북·인스타그램 Shop, Meta 카탈로그 광고를 이용하실 경우에만 설정하시면 됩니다.</span></p>
                            <ul>
                                <li class="mb5">
                                    <strong>Meta 카탈로그 피드URL이란?</strong>
                                    <p class="mb0">블로그페이 상품 정보를 Meta 카탈로그로 보내기 위한 상품 목록 주소(피드URL)를 제공합니다.</p>
                                    <p class="mb0">피드URL을 Meta 커머스 관리자에 한 번 등록하면 설정한 주기마다 Meta가 최신 상품 정보를 가져갑니다.</p>
                                    <p class="mb0">사용 전 ‘포털사이트(SNS) 연동 설정’에서 페이스북 메타태그와 픽셀ID를 반드시 입력해 주세요.</p>
                                </li>
                                <li class="mb5">
                                    <strong>피드URL 설정 방법</strong>
                                    <p class="mb0">1. 피드URL 설정을 [사용함]으로 저장합니다. 피드URL 경로 생성은 최대 하루까지 소요될 수 있습니다.</p>
                                    <p class="mb0">2. Meta 커머스 관리자에서 새 카탈로그를 만들고, 블로그페이에 입력한 픽셀의 데이터 세트를 연결합니다.</p>
                                    <p class="mb0">3. 제품 링크로 피드URL 경로를 입력하고 업데이트 빈도는 [매시간]으로 설정한 후 업로드합니다.</p>
                                    <p class="mb0">자세한 설정 방법은 [도움말]을 확인해 주세요.</p>
                                </li>
                                <li class="mb5">
                                    <strong>피드URL 반영 안내</strong>
                                    <p class="mb0">피드URL의 상품 정보는 Meta 커머스 관리자에 설정한 업데이트 주기에 따라 카탈로그에 반영됩니다.</p>
                                    <p class="mb0">같은 상품을 Meta에 직접 등록했거나 다른 피드로 등록한 경우 상품이 중복될 수 있습니다.</p>
                                    <p class="mb0">품절 상품은 [품절] 상태로 전송되며 전시중지·삭제 상품은 피드에서 제외되어 다음 업데이트 시 카탈로그에서 삭제됩니다.</p>
                                </li>
                                <li>
                                    <strong>피드 필수 항목</strong>
                                    <p class="mb0">아래 항목 중 하나라도 값이 없는 상품은 피드에서 제외되어 Meta 카탈로그에 등록되지 않으니 상품 정보를 확인해 주세요.</p>
                                    <p class="mb0"><span class="red">상품명, 추가 상품 설명, 판매가(0원 제외), 대표 이미지</span></p>
                                </li>
                            </ul>
                        </div>
                        <div class="table-wrap">
                            <table class="table table-bordered">
                                <colgroup>
                                    <col width="15%">
                                    <col width="">
                                </colgroup>
                                <tbody>
                                <tr id="metaStateTr">
                                    <th class="text-center">피드URL 설정</th>
                                    <td>
                                        <label class="radio-inline"><input type="radio" name="metaState" value="1"{' checked=""' if on else ''}>사용함</label>
                                        <label class="radio-inline"><input type="radio" name="metaState" value="0"{'' if on else ' checked=""'}>사용안함</label>
                                        <button type="button" class="btn btn-default btn-sm ml10" id="metaHelpBtn" data-toggle="modal" data-target="#metaHelp">도움말</button>
                                    </td>
                                </tr>{rows}
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            </tbody></table>
            <div class="mgt20 center" id="metaBtn"><a class="btn btn-primary btn-lg" id="metaSaveBtn">저장</a></div>
        </form>
    </div>
'''


MODAL = """
<div id="metaHelp">
  <div class="modal-dialog modal-lg" style="margin:0 auto">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close"><span>×</span></button>
        <h4 class="modal-title text-left">Meta 카탈로그 피드URL 설정방법</h4>
      </div>
      <div class="modal-body-02 text-center">
        <div class="help-intro">
          <h3>Meta 카탈로그 피드URL 설정방법</h3>
          <p>Meta 카탈로그에 상품을 연동하려면 먼저 ‘포털사이트(SNS) 연동 설정’에서 <span class="red"><strong>페이스북 메타태그와 픽셀ID 설정을 모두 완료해야 합니다.</strong></span></p>
          <p>사전 설정 후 ‘피드URL 설정’을 [사용함]으로 저장해 주세요.</p>
          <p>URL 경로가 생성되면 아래 안내에 따라 Meta 커머스 관리자에 등록할 수 있습니다.</p>
          <p>※ Meta 관리자 화면은 업데이트에 따라 안내 이미지와 다를 수 있습니다.</p>
        </div>
        <div class="help-tbd">단계별 설정 방법 (정책 확정 후 작성)</div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary">닫기</button></div>
    </div>
  </div>
</div>"""
MODAL_CSS = """<style>
body{background:transparent!important;margin:0}
#metaHelp{padding:20px 0;width:900px;margin:0 auto}
#metaHelp .help-tbd{margin:20px 30px 30px;padding:120px 0;border:1px dashed #b5b5b5;background:#f5f5f5;color:#777;font-size:15px}
</style>"""

def base(page_state):
    h = SRC.read_text(encoding='utf-8')
    for tr, btn, img in [('sns_Tr', 'snsBtn', 'snsImg'), ('dburl_Tr', 'bdurlBtn', 'dburlImg'), ('publicScript_Tr', 'publicScriptBtn', 'publicScriptImg')]:
        h = re.sub(rf'<tr id="{tr}" style="[^"]*"', f'<tr id="{tr}" style="display:none"', h)
        h = re.sub(rf'(<div class="mgt20 center" id="{btn}") style="[^"]*"', r'\1 style="display:none"', h)
        h = re.sub(rf'<img src="[^"]*" alt="" id="{img}">', f'<img src="{CHEV_DOWN}" alt="" id="{img}">', h)
    anchor = '<div class="table-wrap">\n        <form method="post" name="scriptForm" id="scriptForm">'
    assert anchor in h, 'anchor not found'
    h = h.replace(anchor, block(page_state) + '\n    ' + anchor, 1)
    h = re.sub(r'<script\b[^>]*>.*?</script>', '', h, flags=re.S)
    return h.replace('</head>', CSS + '</head>', 1)

BSRC = BASE / 'admin-basic' / 'sns_connect.html'
GUIDE_ITEMS = [
    ('Meta 카탈로그 피드URL이란?', ['블로그페이 상품 정보를 Meta 카탈로그로 보내기 위한 상품 목록 주소(피드URL)를 제공합니다.',
        '피드URL을 Meta 커머스 관리자에 한 번 등록하면 설정한 주기마다 Meta가 최신 상품 정보를 가져갑니다.',
        '사용 전 ‘포털사이트(SNS) 연동 설정’에서 페이스북 메타태그와 픽셀ID를 반드시 입력해 주세요.']),
    ('피드URL 설정 방법', ['1. 피드URL 설정을 [사용]으로 저장합니다. 피드URL 경로 생성은 최대 하루까지 소요될 수 있습니다.',
        '2. Meta 커머스 관리자에서 새 카탈로그를 만들고, 블로그페이에 입력한 픽셀의 데이터 세트를 연결합니다.',
        '3. 제품 링크로 피드URL 경로를 입력하고 업데이트 빈도는 [매시간]으로 설정한 후 업로드합니다.']),
    ('피드URL 반영 안내', ['피드URL의 상품 정보는 Meta 커머스 관리자에 설정한 업데이트 주기에 따라 카탈로그에 반영됩니다.',
        '같은 상품을 Meta에 직접 등록했거나 다른 피드로 등록한 경우 상품이 중복될 수 있습니다.',
        '품절 상품은 [품절] 상태로 전송되며 전시중지·삭제 상품은 피드에서 제외되어 다음 업데이트 시 카탈로그에서 삭제됩니다.']),
]

def bblock(state):
    on = state != 'off'
    lst = ''
    for i, (t, lines) in enumerate(GUIDE_ITEMS, 1):
        lst += f'<strong>{i}. {t}</strong>' + ''.join(f'<li>{x}<br></li>' for x in lines)
    lst += ('<strong>4. 피드 필수 항목</strong><li>아래 항목 중 하나라도 값이 없는 상품은 피드에서 제외되어 Meta 카탈로그에 등록되지 않으니 상품 정보를 확인해 주세요.<br></li>'
            '<li><span class="red">상품명, 추가 상품 설명, 판매가(0원 제외), 대표 이미지</span></li>')
    url = ''
    if on:
        val = '' if state == 'wait' else FEED_URL
        ph = '피드URL 경로를 생성하고 있습니다. (최대 하루까지 소요)' if state == 'wait' else ''
        url = ('<div class="cont-wrap w60" id="metaUrlTr"><div class="col-xs-3 txt-left">피드URL 경로</div>'
               f'<div class="col-xs-7" style="display:block"><input type="text" id="metaFeedUrl" value="{val}" placeholder="{ph}" readonly=""></div>'
               '<a href="javascript:;" class="btn btn-white btn-lg ml10" id="metaDomainBtn">도메인 변경</a></div>')
    y, n = ('active', '') if on else ('', 'active')
    return ('<form method="post" name="metaForm" id="metaForm"><div class="atc-section">'
        '<h3 class="atc-toggle open" id="metaHead">Meta 카탈로그 피드URL 설정<div class="col-xs-9 f-right t-right"><div class="arrow"></div></div></h3>'
        '<div><div class="atc-txt-lst" id="metaGuide"><ul><p class="red mb5">인스타그램 상품 태그, 페이스북·인스타그램 Shop, Meta 카탈로그 광고를 이용하실 경우에만 설정하시면 됩니다.</p>'
        + lst + '</ul></div><div class="contbox">'
        '<div class="cont-wrap w60 mt20" id="metaStateTr"><div class="col-xs-3 txt-left">피드URL 설정</div><div class="col-xs-9 tab"><ul class="w100">'
        f'<li class="{y}" id="metaY"><a href="javascript:;">사용</a></li><li class="{n}" id="metaN"><a href="javascript:;">사용안함</a></li></ul></div></div>'
        + url + '</div></div></div>'
        '<div class="bot-btn-area" id="metaBtn"><a href="javascript:;" id="metaSaveBtn" class="btn btn-blue btn-xl">저장</a></div></form>\n')

def bbase(state):
    h = BSRC.read_text(encoding='utf-8')
    for k in (1, 2, 3):
        h = re.sub(rf'<h3 class="atc-toggle open"([^>]*data-menunum="{k}")', r'<h3 class="atc-toggle"\1', h)
        h = re.sub(rf'<div id="contbox_{k}" style="[^"]*"', f'<div id="contbox_{k}" style="display:none"', h)
        h = re.sub(rf'(<div class="bot-btn-area" id="savebtn_{k}"[^>]*) style="[^"]*"', r'\1 style="display:none"', h)
    anchor = '<form method="post" name="scriptForm" id="scriptForm">'
    assert anchor in h
    return h.replace(anchor, bblock(state) + anchor, 1)


def make(state):
    if state == 'modal':
        h = SRC.read_text(encoding='utf-8')
        head = re.sub(r'<script\b[^>]*>.*?</script>', '', h.split('<body', 1)[0], flags=re.S)
        h = head.replace('</head>', CSS + MODAL_CSS + '</head>', 1) + '<body>' + MODAL + '</body></html>'
        out = OUT / 'modal.html'
    elif state.startswith('b-'):
        h = bbase({'on': 'done'}.get(state[2:], state[2:]))
        out = BASE / 'admin-basic' / f'{state}.html'
    else:
        h = base({'on': 'done'}.get(state, state))
        out = OUT / f'{state}.html'
    out.write_text(h, encoding='utf-8')
    print(out)

for s in (sys.argv[1:] or ['on', 'off', 'wait', 'modal', 'b-on', 'b-off', 'b-wait']):
    make(s)
