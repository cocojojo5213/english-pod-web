"""在转录词流中精确匹配短语；使用完整片段约束避免对齐到其他复习轮次。"""
import re


def tokens(text):
    return re.findall(r"[a-z0-9]+", str(text).lower().replace('’', "'"))


def word_stream(segments, duration):
    result=[]
    for segment in segments:
        for word in segment.get('words',[]):
            a,b=word.get('start'),word.get('end')
            if not isinstance(a,(int,float)) or not isinstance(b,(int,float)) or not 0<=a<b<=duration:
                continue
            for token in tokens(word.get('word','')):
                result.append((token,a,b))
    return result


def occurrences(stream, phrase, lower=0, upper=float('inf')):
    needle=tokens(phrase)
    if not needle:return []
    found=[]
    for i in range(len(stream)-len(needle)+1):
        if not lower<=stream[i][1]<upper:continue
        if [w[0] for w in stream[i:i+len(needle)]]==needle:
            end=stream[i+len(needle)-1][2]
            if end<=upper:found.append((stream[i][1],end,i,i+len(needle)))
    return found


def align_vocabulary(stream,term,definition,review_start,duration):
    if review_start is None:return None
    defs=occurrences(stream,definition,review_start,duration)
    answers=occurrences(stream,term,review_start,duration)
    # 定义后紧接答案，最多8秒停顿；不允许跳过其他词。
    for a in defs:
        for b in answers:
            if b[2]==a[3] and 0<=b[0]-a[1]<=8 and b[1]-a[0]<35:
                return {'start':a[0],'end':min(duration,b[1]+.15),'method':'exact-definition-answer'}
    return None


def align_dialogue(stream,lines,duration,expected_start=None):
    if len(lines)<2:return None
    first=tokens(lines[0]);last=tokens(lines[-1])
    starts=occurrences(stream,' '.join(first[:min(8,len(first))]),0,duration*.65)
    ends=occurrences(stream,' '.join(last[-min(8,len(last)):]),0,duration*.85)
    target=tokens(' '.join(lines))
    candidates=[]
    import difflib
    for a in starts:
        for b in ends:
            if not 10<b[1]-a[0]<min(600,duration*.7):continue
            observed=[x[0] for x in stream[a[2]:b[3]]]
            ratio=difflib.SequenceMatcher(None,target,observed,autojunk=False).ratio()
            if expected_start is not None:
                ratio -= min(.12,abs(a[0]-expected_start)/duration*.12)
            if ratio>=.78 and .6<=len(observed)/len(target)<=1.4:
                candidates.append((a,b,ratio))
    if not candidates:return None
    # 同文重复中选择时长最短的一遍，排除显著放慢版。
    a,b,ratio=max(candidates,key=lambda x:x[2])
    return {'start':a[0],'end':min(duration,b[1]+.15),'method':'whole-dialogue-match','similarity':round(ratio,4)}
