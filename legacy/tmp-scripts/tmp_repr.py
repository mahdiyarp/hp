path='frontend/src/modules/FinanceModule.tsx'
lines=open(path,'r',encoding='utf-8').read().splitlines()
start=502
end=508
block='\n'.join(lines[start:end])
with open('block_debug.txt','w',encoding='utf-8') as out:
    out.write(block + '\n')
    out.write(repr(block))
