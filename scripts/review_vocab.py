"""从复习段提取保守的释义/词汇候选，边界不清的条目留在全文中。"""
import re

def vocabulary(segments, review_start, duration, cid):
    selected=[s for s in segments if s['start']>=review_start and s['end']<=duration]
    result=[]
    for a,b in zip(selected,selected[1:]):
        text=a['text'].strip(); answer=b['text'].strip()
        if re.search(r'let.s try that faster|now say the word',text,re.I):break
        if re.search(r'faster|sentence|audio review|say the|listen to',text+' '+answer,re.I):continue
        if 3<=len(text.split())<=18 and 1<=len(answer.split())<=6 and len(text)>len(answer) and not re.search(r'[.!?].+\w',answer):
            if result and a['start']<result[-1]['end']:continue
            result.append({'id':f'{cid}-vocab-{len(result)}','term':answer.strip(' .,'),'definition':text,'start':a['start'],'end':b['end'],'status':'自动提取，待核对'})
    return result
