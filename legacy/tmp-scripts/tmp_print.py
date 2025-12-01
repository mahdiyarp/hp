path='frontend/src/modules/FinanceModule.tsx'
with open(path,'r',encoding='utf-8') as f:
    lines=f.readlines()
for i in range(480,520):
    print(f"{i+1}: {lines[i].rstrip()}")
