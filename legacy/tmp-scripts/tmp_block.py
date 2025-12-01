path='frontend/src/modules/FinanceModule.tsx'
with open(path,'r',encoding='utf-8') as f:
    lines=f.readlines()
with open('block.txt','w',encoding='utf-8') as out:
    for i in range(484,508):
        out.write(f"{i+1:04}: {lines[i]}")
