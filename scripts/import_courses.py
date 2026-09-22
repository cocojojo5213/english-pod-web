#!/usr/bin/env python3
"""从本机字幕导入课程、章节和可追溯的英文讲解，生成文件不进入代码仓库。"""
import json, os, re, subprocess
from pathlib import Path
from review_vocab import vocabulary
ROOT = Path(os.environ.get('MEDIA_ROOT', '/home/ubuntu/english pod'))
OUT = Path(os.environ.get('DATA_ROOT', Path(__file__).resolve().parents[1] / 'data'))
MARKERS = [('vocabulary preview','词汇预习'),('language takeaway','词汇讲解'),('putting it together','短语与搭配'),('fluency builder','地道表达'),('audio review','音频复习')]
def seconds(value):
    h,m,s = value.replace(',', '.').split(':')
    return int(h)*3600+int(m)*60+float(s)
def parse(text):
    result=[]
    for block in re.split(r'\n\s*\n',text.strip()):
        lines=block.splitlines()
        if len(lines)<3 or ' --> ' not in lines[1]: continue
        start,end=map(seconds,lines[1].split(' --> '))
        result.append({'start':start,'end':end,'text':' '.join(lines[2:]).strip()})
    return result

def chapters(cues,duration):
    """按节目提示语寻找真正的 Dialogue 起止点；提示语本身不属于对话。"""
    found=[{'start':0,'title':'完整播客','kind':'full'}]
    dialogue=[]
    triggers=[]
    for i,cue in enumerate(cues):
        text=cue['text'].lower()
        if 'listen to the dialogue' in text or 'listen to the dialog' in text:
            triggers.append(i)
    for i in triggers:
        start=i+1
        while start<len(cues) and cues[start]['start']-cues[i]['end']<8 and not cues[start]['text'].strip(): start+=1
        if start>=len(cues): continue
        end=len(cues)
        for j in range(start+1,len(cues)):
            text=cues[j]['text'].lower()
            if ('language takeaway' in text or 'fluency builder' in text or 'audio review' in text or 'putting it together' in text or 'so erica' in text or 'so marco' in text) and j>start+1:
                end=j;break
        if end>start:
            dialogue.append({'start':cues[start]['start'],'end':cues[end-1]['end'],'title':f'Dialogue {len(dialogue)+1}','kind':'dialogue'})
    # 某些节目在提示语后先有一小段“现在开始”，跳过主持人的过渡句。
    cleaned=[]
    for d in dialogue:
        segment=[c for c in cues if d['start']<=c['start']<d['end']]
        while len(segment)>1 and any(x in segment[0]['text'].lower() for x in ['now we','so let','okay this','one more time']):
            segment.pop(0);d['start']=segment[0]['start']
        if not cleaned or d['start']>cleaned[-1]['end']+1: cleaned.append(d)
    found.extend(cleaned)
    review_i=next((i for i,c in enumerate(cues) if 'audio review' in c['text'].lower()),None)
    if review_i is not None: found.append({'start':cues[review_i]['start'],'title':'最后词汇复习','kind':'review','end':duration})
    return sorted(found,key=lambda c:c['start'])

def review_items(cues, start, duration, cid):
    """把末尾 Audio Review 的全部英文原文保留下来，按字幕行显示词汇、解释与例句。"""
    segment=[c for c in cues if start<=c['start']<duration]
    return [{'id':f'{cid}-review-{i}','title':c['text'],'section':'最后词汇复习','start':c['start'],'end':c['end'],'text':c['text']} for i,c in enumerate(segment)]

def episode_number(title, fallback):
    match=re.search(r'episode\s+(\d+)',title,re.I)
    return int(match.group(1)) if match else fallback

def build():
    (OUT/'courses').mkdir(parents=True,exist_ok=True)
    catalog=[]
    overrides_path=OUT/'review-overrides.json'
    overrides=json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
    transcript_path=ROOT/'_subtitle_verify_2026-09-22/full-transcripts-large-v3.json'
    transcripts={r['file']:r.get('segments',[]) for r in json.loads(transcript_path.read_text())['results']} if transcript_path.exists() else {}
    for level,slug in [('初级','beginner'),('中级','intermediate'),('高级','advanced')]:
        for audio in sorted((ROOT/level).glob('*.m4a')):
            cues=parse(audio.with_suffix('.clean.srt').read_text())
            duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(audio)],text=True).strip())
            file_number=int(audio.name.split(' - ')[0]); cid=f'{slug}-{file_number:02}'
            raw_title=audio.stem.split(' - ',1)[1]
            number=episode_number(raw_title,file_number)
            title=re.split(r' - English (?:Podcast|For|Learning)',raw_title)[0]
            chapter_list=chapters(cues,duration)
            review=next((c for c in chapter_list if c['kind']=='review'),None)
            notes=review_items(cues,review['start'],review['end'],cid) if review else []
            item={'id':cid,'level':level,'number':number,'fileNumber':file_number,'title':title,'originalTitle':audio.stem,'duration':duration,'file':str(audio.relative_to(ROOT)),'available':not audio.with_suffix('.m4a.aria2').exists(),'noteCount':len(notes)}
            catalog.append(item)
            vocab=vocabulary(transcripts.get(str(audio.relative_to(ROOT)),[]),review['start'],duration,cid) if review else []
            if cid in overrides:
                override=overrides[cid]
                chapter_list=[c for c in chapter_list if c['kind']!='dialogue']+override.get('dialogues',[])
                chapter_list.sort(key=lambda c:c['start'])
                vocab=[{'id':f'{cid}-vocab-{i}','term':v[0],'definition':v[1],'start':v[2],'end':v[3],'status':'已按原文整理；时间点待听校'} for i,v in enumerate(override.get('vocabulary',[]))]
            (OUT/'courses'/f'{cid}.json').write_text(json.dumps({**item,'cues':cues,'chapters':chapter_list,'notes':notes,'vocabulary':vocab,'dialogueText':overrides.get(cid,{}).get('dialogueText',[])},ensure_ascii=False))
    catalog.sort(key=lambda c: (['初级','中级','高级'].index(c['level']), c['number'], c['fileNumber']))
    (OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False))
    print(f'已导入 {len(catalog)} 课，{sum(c["noteCount"] for c in catalog)} 段原文讲解')
if __name__=='__main__':build()
