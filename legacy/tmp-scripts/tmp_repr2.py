path='frontend/src/modules/FinanceModule.tsx'
lines=open(path,'r',encoding='utf-8').read().splitlines()
start=498
end=506
block='\n'.join(lines[start:end])
with open('repr_block.txt','w',encoding='utf-8') as out:
    out.write(block.replace(' ', '·'))
    out.write('\n')
    out.write(repr(block))
