path='frontend/src/modules/FinanceModule.tsx'
with open(path,'r',encoding='utf-8') as f:
    text=f.read()
target='                  <option value="other">á?á?ä?á?</option>\n                </select>\n              </div>\n'
print('present', target in text)
if target not in text:
    raise SystemExit('target missing')
text=text.replace(target,'',1)
with open(path,'w',encoding='utf-8') as f:
    f.write(text)
