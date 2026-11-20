import sys
from bs4 import BeautifulSoup
state=sys.argv[1]   # default | modal | alert1 | alert2
soup=BeautifulSoup(open('review_list.html',encoding='utf8').read(),'html.parser')
def H(h): return BeautifulSoup(h,'html.parser')
for e in soup.select('#scheduleDiv'): e.decompose()
main=soup.select_one('.main.clearfix'); main.select_one('h2.page-header').clear(); main.select_one('h2.page-header').append('스마트스토어 구매후기 일괄 등록')
lp=main.select_one('#listpage'); lp.clear()
IMG='./블로그페이 관리자_files/0023119001782982308.jpg'
lp.append(H('''
<div class="alert alert-warning mb10" style="line-height:1.9">
- [네이버 스마트스토어 &gt; 문의/리뷰관리 &gt; 리뷰 관리] 에서 내려받은 리뷰 엑셀 파일을 업로드하여 일괄 등록합니다.<br>
- 엑셀 파일은 원본 그대로 업로드해 주세요. 파일을 수정하면 등록되지 않을 수 있습니다.<br>
- 엑셀 업로드 후 쇼핑몰 상품과 매칭을 완료해야 등록될 수 있으며, 매칭되지 않은 상품의 구매후기는 등록되지 않습니다.<br>
- 이미 등록된 구매후기는 다시 업로드하면 최신 내용으로 수정됩니다.</div>
<div class="table-wrap"><table class="table table-bordered" id="fileTb"><colgroup><col style="width:15%"><col></colgroup><tbody><tr>
<th class="text-center">엑셀파일</th>
<td><a class="btn btn-default btn-sm" id="fileBtn">파일 선택</a> <span class="ml10">review_20260101_1234.xlsx</span></td></tr></tbody></table></div>
<div class="text-center mt15 mb15"><a class="btn btn-primary btn-sm" id="xlsBtn">엑셀업로드</a> <a class="btn btn-default btn-sm ml5" id="listBtn">목록</a></div>
<div class="clearfix mb5"><div class="table-state pull-left" style="margin-top:12px">총 <strong class="red">99</strong> 건</div>
<div class="pull-right"><a class="btn btn-default btn-sm" id="bulkSelBtn">일괄 상품선택</a> <a class="btn btn-default btn-sm ml3" id="delBtn">선택삭제</a></div></div>
<table class="table table-bordered" id="matchTb"><colgroup><col style="width:4%"><col style="width:30%"><col style="width:12%"><col style="width:36%"><col style="width:18%"></colgroup>
<thead><tr><th class="text-center active"><input type="checkbox" class="all_chk"></th><th class="text-center active">스마트스토어 상품정보</th><th class="text-center active">구매후기 글</th><th class="text-center active">매칭 상품정보</th><th class="text-center active">상품선택</th></tr></thead>
<tbody>
<tr><td class="text-center"><input type="checkbox"></td><td class="text-center">스마트스토어 상품명 A (13850508751)</td><td class="text-center">99건</td><td><div class="board-prd"><img alt="" src="@@IMG@@"><span>상품명 A (A1234-B1234-C1234)</span></div></td><td class="text-center"><a class="btn btn-default btn-sm pickBtn">상품선택</a></td></tr>
<tr><td class="text-center"><input type="checkbox"></td><td class="text-center">스마트스토어 상품명 B (13850508751)</td><td class="text-center">99건</td><td class="text-center">-</td><td class="text-center"><a class="btn btn-default btn-sm pickBtn">상품선택</a></td></tr>
</tbody></table>
<div class="text-center mt20"><a class="btn btn-primary btn-sm" id="saveBtn">저장</a></div>'''.replace('@@IMG@@',IMG)))
def modal(inner,cls='modal-dialog-750',id_='m1'):
    return H('<div class="modal fade in" id="%s" style="display:block"><div class="modal-dialog %s" style="margin-top:120px"><div class="modal-content">%s</div></div></div><div class="modal-backdrop fade in"></div>'%(id_,cls,inner))
if state=='modal':
    P='./블로그페이 관리자_files/'
    inner='''<div class="modal-header"><h4 class="modal-title">상품 리스트</h4></div><div class="modal-body">
<div class="alert alert-warning mb10" style="line-height:1.9">- 구매후기를 작성할 상품 리스트입니다.<br>- 상품은 하나만 선택가능 합니다.</div>
<div class="table-wrap"><table class="table table-bordered"><colgroup><col style="width:15%"><col><col style="width:12%"></colgroup><tbody><tr><th class="text-center">상품명</th><td><input class="form-control input-sm" type="text"></td><td class="text-center"><a class="btn btn-dark btn-sm">검색</a></td></tr></tbody></table></div>
<div class="table-state">총 상품 <strong class="red">4</strong>개</div>
<div class="clearfix mb5"><div class="pull-left"><a class="btn btn-primary btn-sm">선택상품 적용</a></div><div class="pull-right"><select class="form-control form-select-sm"><option>20개씩</option></select></div></div>
<table class="table table-bordered"><colgroup><col style="width:8%"><col></colgroup><thead><tr><th class="active"></th><th class="text-center active">상품정보</th></tr></thead><tbody>'''
    for n,i in [('상품A','0676562001794474670.jpg'),('지상 최고의 노트북','0023119001782982308.jpg'),('상품C','0232309001794496382.jpg'),('상품D','0918955001794557753.jpg')]:
        inner+='<tr><td class="text-center"><input type="radio" name="pick"></td><td><div class="board-prd"><img alt="" src="%s%s"><span>%s</span></div></td></tr>'%(P,i,n)
    inner+='</tbody></table></div>'
    for e in modal(inner,'modal-dialog-750','m1'): soup.body.append(e)
if state in('alert1','alert2'):
    msg='등록되었습니다. 상품정보를 확인하고 매칭해 주세요.' if state=='alert1' else '등록되었습니다.'
    css='<style>#nAlert{position:fixed;top:24px;left:50%;margin-left:-180px;width:360px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.35);padding:24px 24px 20px;z-index:99999;transform:scale(1.4);transform-origin:top center;font-family:Pretendard,"Noto Sans KR",sans-serif;color:#1f1f1f}#nAlert h4{margin:0 0 12px;font-size:16px;font-weight:400}#nAlert p{margin:0;font-size:14px;line-height:20px}#nAlert .b{display:flex;justify-content:flex-end;margin-top:22px}#nAlert .b span{display:inline-block;padding:10px 24px;border-radius:999px;background:#2f5a8f;color:#fff;font-size:14px;box-shadow:0 0 0 2px #fff,0 0 0 4px #2f5a8f}</style>'
    html='<div id="nAlert"><h4>sample.shop.blogpay.co.kr 내용:</h4><p>%s<br>(성공 - 99건 / 실패 - 99건)</p><div class="b"><span>확인</span></div></div>'%msg
    soup.head.append(H(css))
    soup.body.append(H(html))
open('bulk_%s.html'%state,'w',encoding='utf8').write(str(soup))
