"""将逐课编辑候选转为网站内容。没有核实的时间不生成循环片段。"""
import hashlib
import re


def normalize(text):
    return re.sub(r"[^a-z0-9]+", " ", str(text).lower()).strip()


def prepare(candidate, source, cid):
    vocab, rejected = [], []
    source_words = set(normalize(source).split())
    seen = set()
    for item in candidate.get('vocabulary', []):
        term, definition, quote = (item.get(k) for k in ('term', 'definition', 'sourceQuote'))
        if not all(isinstance(s, str) and s.strip() for s in (term, definition, quote)):
            rejected.append({'term': term, 'reason': '缺少词汇、释义或来源'})
            continue
        words = set(normalize(quote).split())
        if not words or len(words & source_words) / len(words) < .8:
            rejected.append({'term': term, 'reason': '来源需复核'})
            continue
        key = normalize(term)
        if key in seen:
            continue
        seen.add(key)
        definition = definition.strip()
        definition = definition[0].upper() + definition[1:]
        if definition[-1] not in '.!?':
            definition += '.'
        vocab.append({'id': cid + '-word-' + hashlib.sha256(key.encode()).hexdigest()[:10],
                      'term': term.strip(), 'definition': definition, 'start': None, 'end': None,
                      'example': item.get('example') if isinstance(item.get('example'), str) else None})
    turns = (candidate.get('dialogue') or {}).get('turns', [])
    lines = []
    for turn in turns:
        text = turn.get('text')
        if not isinstance(text, str) or not text.strip():
            continue
        # 同一说话人连续内容合为一段，不把停顿或字幕换行当成换人。
        speaker = str(turn.get('speaker', ''))
        if lines and speaker and speaker == lines[-1]['speaker']:
            lines[-1]['text'] += ' ' + text.strip()
        else:
            lines.append({'speaker': speaker, 'text': text.strip()})
    return vocab, [line['text'] for line in lines], rejected
