import re
from bs4 import BeautifulSoup
soup=BeautifulSoup(open('admin_src.html',encoding='utf8').read(),'html.parser')
def H(h): return BeautifulSoup(h,'html.parser')
for t in soup(['script','noscript']): t.decompose()
for sel in ['#fantalk-chat-launcher','#fantalk-chat-panel']:
    for e in soup.select(sel): e.decompose()
for em in soup.select('.user-info em'): em.clear(); em.append('홍길동(sample)')
for a in soup.find_all('a'):
    if a.has_attr('href'): a['href']='#'
    if a.has_attr('target'): del a['target']
for e in soup.select('a[title="마케터링크"]'):
    ul=e.find_parent('ul'); (ul or e).decompose()
for e in soup.select('.top-banner'): e.decompose()
# 일괄등록 버튼: 적립금 일괄지급 뒤
sm=soup.select_one('#savedMoneys')
sm.insert_after(H('<a class="btn btn-primary btn-sm" id="ssBulkBtn" href="#" style="margin-left:3px">스마트스토어 구매후기 일괄등록</a>').a)
soup.head.append(H('<link rel="stylesheet" href="./블로그페이 관리자_files/lab.css">'))
open('review_list.html','w',encoding='utf8').write(str(soup))
