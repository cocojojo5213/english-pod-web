import json, pathlib, re, sys, os
from curated_content import prepare
from align_editorial import word_stream, align_vocabulary, align_dialogue
ROOT=pathlib.Path('/home/ubuntu/english pod'); OUT=pathlib.Path(os.environ.get('DATA_ROOT',pathlib.Path(__file__).resolve().parents[1]/'data')); editorial=pathlib.Path(os.environ.get('EDITORIAL_ROOT',OUT/'editorial'))
def source_for(cid):
 slug,number=cid.split('-');level={'beginner':'初级','intermediate':'中级','advanced':'高级'}[slug]
 return next((p for p in (ROOT/level).glob(f'{int(number):02} - *.txt')),None)
def main():
 catalog=json.loads((OUT/'catalog.json').read_text()); counts=[]; rejected=[]
 transcript_path=ROOT/'_subtitle_verify_2026-09-22/full-transcripts-large-v3.json'
 transcripts={r['file']:r.get('segments',[]) for r in json.loads(transcript_path.read_text())['results']}
 alignment_report=[]
 for item in catalog:
  cid=item['id']; source=source_for(cid); candidate=editorial/f'{cid}.json'
  if not candidate.exists():
   candidate=pathlib.Path('/tmp/english-pod-deepseek/full')/f'{cid}.json'
  if not candidate.exists():
   rejected.append({'id':cid,'reason':'缺候选'});continue
  raw=json.loads(candidate.read_text()); text=source.read_text() if source else ''
  vocab,dialogue,reject=prepare(raw,text,cid)
  detail=json.loads((OUT/'courses'/f'{cid}.json').read_text())
  stream=word_stream(transcripts.get(item['file'],[]),item['duration'])
  review=next((c for c in detail['chapters'] if c['kind']=='review'),None)
  review_start=max(0,review['start']-15) if review else None
  aligned_words=0
  for word in vocab:
   match=align_vocabulary(stream,word['term'],word['definition'],review_start,item['duration'])
   if match:
    word.update(start=match['start'],end=match['end']);aligned_words+=1
  expected_start=(raw.get('dialogue') or {}).get('start')
  if not isinstance(expected_start,(int,float)):expected_start=None
  match=align_dialogue(stream,dialogue,item['duration'],expected_start)
  alignment_report.append({'id':cid,'words':len(vocab),'matchedWords':aligned_words,'dialogueMatch':match})
  detail['vocabulary']=vocab;detail['dialogueText']=dialogue;detail['curated']=True
  detail.pop('curationIssues',None)
  detail['chapters']=[c for c in detail['chapters'] if c.get('kind')!='dialogue']
  if dialogue and (raw.get('dialogue') or {}).get('turns'):
   detail['chapters'].append({'start':match['start'] if match else None,'end':match['end'] if match else None,'title':'原速 Dialogue','kind':'dialogue','playable':bool(match)})
  detail['chapters'].sort(key=lambda c:c.get('start') if isinstance(c.get('start'),(int,float)) else 10**9)
  detail['noteCount']=len(vocab)
  (OUT/'courses'/f'{cid}.json').write_text(json.dumps(detail,ensure_ascii=False))
  item['noteCount']=len(vocab)
  counts.append((cid,len(vocab),bool(dialogue)))
 (OUT/'alignment-report.json').write_text(json.dumps(alignment_report,ensure_ascii=False,indent=2))
 print('精确匹配词条',sum(r['matchedWords'] for r in alignment_report),'完整对话匹配',sum(bool(r['dialogueMatch']) for r in alignment_report))
 (OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False))
 print('已写入课程',len(counts),'缺失',rejected)
 print('词汇总',sum(x[1] for x in counts),'有整理Dialogue',sum(x[2] for x in counts))
 (OUT/'curation-report.json').write_text(json.dumps({'courses':len(counts),'missing':rejected,'counts':counts,'status':'候选已结构化，时间轴需逐课听校'},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
