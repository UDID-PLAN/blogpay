import re
from bs4 import BeautifulSoup
soup=BeautifulSoup(open('render.html',encoding='utf8').read(),'html.parser')
def H(h): return BeautifulSoup(h,'html.parser')
def setText(el,t): el.clear(); el.append(t)
for sel in ['#fantalk-chat-launcher','#fantalk-chat-panel']:
    for e in soup.select(sel): e.decompose()
for em in soup.select('.user-info em'): setText(em,'홍길동(sample)')
for a in soup.find_all('a'):
    if a.has_attr('href'): a['href']='#'
    if a.has_attr('target'): del a['target']
# 페이지 헤더: 제목 + 가져오기 버튼
ph=soup.select_one('h2.page-header'); ph.contents[0].replace_with('\n    연동상품관리\n    ')
btn=ph.find('a'); btn['class']=['pull-right','btn','btn-primary','btn-sm']; btn['id']='importBtn'; btn.clear(); btn.append(H('<strong>스마트스토어 상품 가져오기</strong>'))
# LNB
lnb=soup.select_one('ul.nav-sidebar')
for li in lnb.find_all('li'):
    if 'active' in li.get('class',[]): li['class']=[c for c in li['class'] if c!='active']
base=[li for li in lnb.find_all('li') if li.get_text(strip=True)=='상품관리'][0]
base.insert_after(H('<li class="active"><a href="#">연동상품관리</a></li>').li)
# 검색: 과세구분 → 연동상태
form=soup.select_one('#goodSearchForm'); form.select_one('#sNameKey')['value']=''
for th in form.find_all('th'):
    if th.get_text(strip=True)=='과세구분':
        th.string='연동상태'; td=th.find_next_sibling('td'); td.clear()
        for j,l in enumerate(['전체','연동완료','연동실패','연동대기']):
            td.append(H('<label class="checkbox-inline"><input type="radio" name="linkState" %s>%s</label>'%('checked' if j==0 else '',l)))
# 툴바: 선택상품 연동해제/내보내기
fl=soup.select_one('.table-action .float_l')
fl.select_one('#selectDeleteBtn').string='선택상품 연동해제'
reg=fl.select_one('a.btn-primary'); reg.string='선택상품 내보내기'; reg['class']=['btn','btn-primary','btn-sm','ml1']
# 표
tb=soup.select_one('#listpage table')
cols=tb.select('colgroup col')
cols[9]['style']='width:8%;'                       # 연동상태
newcol=soup.new_tag('col'); newcol['style']='width:8%;'; cols[10].insert_after(newcol)  # 연동정보
ths=tb.select('thead tr th')
ths[2].clear(); ths[2].append('구분')
ths[9].clear(); ths[9].append(H('연동상태 <a href="#"><i class="fa fa-question-circle fa-lg tooltip2-btn" aria-hidden="true"></i></a>'))
ths[10].clear(); ths[10].append(H('연동일<div>수정일</div>'))
th_new=soup.new_tag('th',**{'class':'text-center active vertical_50'}); th_new.string='연동정보'; ths[10].insert_after(th_new)
states=[('연동실패','red'),('연동완료','blue'),('연동대기','')]
for tr,(st,tone) in zip(tb.select('tbody > tr'),states):
    tds=tr.find_all('td',recursive=False)
    # 구분: 스마트스토어 뱃지
    tds[2].clear(); tds[2].append(H('<span class="label label-success mb2">스마트스토어</span>'))
    # 연동상태
    mark=' <a href="#"><i class="fa fa-exclamation-circle fa-lg" style="color:#e11"></i></a>' if st=='연동실패' else ''
    cls={'연동실패':'color:#e11;','연동완료':'color:#1a73e8;','연동대기':'color:#555;'}[st]
    tds[9].clear(); tds[9].append(H('<span style="%s font-weight:500;">%s</span>%s'%(cls,st,mark)))
    # 연동정보 버튼
    info=H('<td class="text-center"><a class="btn btn-secondary btn-sm d-block">수정</a><a class="btn btn-default btn-sm mt3 d-block">연동해제</a><a class="btn btn-default btn-sm mt3 d-block">내보내기</a></td>').td
    tds[10].insert_after(info)
    # 관리: 삭제 비활성
    d=tds[11].select_one('.deleteBtn')
    if d: d['style']='cursor:not-allowed;opacity:.35;'
    # 최수빈 계정 ID 마스킹
    for dv in tds[10].find_all('div'):
        if 'bean701' in dv.get_text(): dv.string='(sample)'
open('out/linked_list.html','w',encoding='utf8').write(str(soup))
