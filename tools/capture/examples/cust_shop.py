from bs4 import BeautifulSoup
soup=BeautifulSoup(open('shop_src.html',encoding='utf8').read(),'html.parser')
for t in soup(['script','noscript']): t.decompose()
for a in soup.find_all('a'):
    if a.has_attr('href'): a['href']='#'
c=soup.select_one('.board-content-wrap')
for e in c.select('.board-menu'): e.decompose()
for e in c.select('.board-view-btnbox'): pass
body=soup.body
for ch in list(body.children):
    if getattr(ch,'name',None): ch.extract()
wrap=soup.new_tag('div'); wrap['id']='cap'; wrap['style']='padding:10px 50px;background:#fff'
wrap.append(c); body.append(wrap)
open('shop_detail.html','w',encoding='utf8').write(str(soup))
