path='frontend/src/modules/FinanceModule.tsx'
text=open(path,'r',encoding='utf-8').read()
idx=text.find('option value="other"')
with open('opt_debug.txt','w',encoding='utf-8') as out:
    out.write(str(idx)+'\n')
    out.write(text[idx:idx+120])
