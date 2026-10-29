import type { WordAnatomy } from '@/types/word';
import type { Language } from '@/utils/i18n';

/**
 * 计算词汇音节数、推测难度星级、提取常见派生词缀
 */
export const getWordAnatomy = (
    word: string,
    currentBookValue: string = '',
    lang: Language = 'zh'
): WordAnatomy => {
    if (!word) return { syllables: 1, difficulty: 1, vowelsCount: 0, consonantsCount: 0 };
    const lower = word.toLowerCase().trim();
    
    // 1. 计算音节数量 (辅音+元音组合的简易推算规则)
    let syllables = 1;
    if (lower.length > 3) {
        let w = lower.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        w = w.replace(/^y/, '');
        const syls = w.match(/[aeiouy]{1,2}/g);
        syllables = syls ? syls.length : 1;
    }
    
    // 2. 根据长度及当前选中的词书粗略计算难度等级 (1-5 星)
    let difficulty = 2;
    if (lower.length > 8) difficulty += 2;
    else if (lower.length > 6) difficulty += 1;
    
    if (currentBookValue.includes('IELTS')) {
        difficulty += 1;
    } else if (currentBookValue.includes('CET6') || currentBookValue.includes('KaoYan')) {
        difficulty += 0.5;
    }
    difficulty = Math.min(Math.max(Math.round(difficulty), 1), 5);
    
    // 3. 常见词尾/派生后缀检测与语法角色说明
    const isZh = lang === 'zh';
    let suffixInfo: { suffix: string; meaning: string } | undefined;
    if (lower.endsWith('tion')) {
        suffixInfo = { suffix: '-tion', meaning: isZh ? '名词后缀，表示行为、状态或结果' : 'Noun suffix, indicating action, state, or result' };
    } else if (lower.endsWith('ment')) {
        suffixInfo = { suffix: '-ment', meaning: isZh ? '名词后缀，表示行为、手段或结果物' : 'Noun suffix, indicating action, means, or result' };
    } else if (lower.endsWith('ness')) {
        suffixInfo = { suffix: '-ness', meaning: isZh ? '名词后缀，加在形容词后表示性质或状态' : 'Noun suffix, added to adjectives indicating quality or state' };
    } else if (lower.endsWith('ity')) {
        suffixInfo = { suffix: '-ity', meaning: isZh ? '名词后缀，表示性质、状态或程度' : 'Noun suffix, indicating quality, state, or degree' };
    } else if (lower.endsWith('tive')) {
        suffixInfo = { suffix: '-tive', meaning: isZh ? '形容词后缀，表示有…倾向或属性的' : 'Adjective suffix, indicating tendency or quality' };
    } else if (lower.endsWith('able')) {
        suffixInfo = { suffix: '-able', meaning: isZh ? '形容词后缀，表示能够…的或值得…的' : 'Adjective suffix, indicating capability or worthiness' };
    } else if (lower.endsWith('ful')) {
        suffixInfo = { suffix: '-ful', meaning: isZh ? '形容词后缀，表示充满…的或具有…特性的' : 'Adjective suffix, indicating being full of or having qualities of' };
    } else if (lower.endsWith('ous')) {
        suffixInfo = { suffix: '-ous', meaning: isZh ? '形容词后缀，表示充满…的或具有…性质的' : 'Adjective suffix, indicating being full of or having properties of' };
    } else if (lower.endsWith('ify')) {
        suffixInfo = { suffix: '-ify', meaning: isZh ? '动词后缀，表示使…化、成为…' : 'Verb suffix, indicating making or becoming' };
    } else if (lower.endsWith('ize')) {
        suffixInfo = { suffix: '-ize', meaning: isZh ? '动词后缀，表示…化、照…方式对待' : 'Verb suffix, indicating making or acting in a certain way' };
    } else if (lower.endsWith('ly') && lower.length > 4) {
        suffixInfo = { suffix: '-ly', meaning: isZh ? '副词后缀，表示以…的方式或状态' : 'Adverb suffix, indicating manner or state' };
    }
    
    const vowelsCount = lower.match(/[aeiouy]/g)?.length ?? 0;
    const consonantsCount = Math.max(0, lower.length - vowelsCount);

    return { syllables, difficulty, suffixInfo, vowelsCount, consonantsCount };
};

const POS_NORMALIZATION_MAP: Record<string, string> = {
    n: 'noun',
    noun: 'noun',
    v: 'verb',
    verb: 'verb',
    vi: 'verb',
    vt: 'verb',
    'vt&vi': 'verb',
    'vi&vt': 'verb',
    a: 'adj',
    adj: 'adj',
    adjective: 'adj',
    ad: 'adv',
    adv: 'adv',
    adverb: 'adv',
    prep: 'prep',
    preposition: 'prep',
    conj: 'conj',
    conjunction: 'conj',
    pron: 'pron',
    pronoun: 'pron',
    art: 'art',
    article: 'art',
    num: 'num',
    numeral: 'num',
    int: 'int',
    interj: 'int',
    abbr: 'abbr',
    modal: 'modal',
    aux: 'aux',
};

/**
 * 校验并规范化单个词性字符串，过滤非合法英文词性脏数据
 */
export const normalizePos = (rawPos: string): string | null => {
    if (!rawPos) return null;
    const clean = rawPos
        .replace(/^["'“”«»]+|["'“”«»]+$/g, '')
        .trim()
        .replace(/\.$/, '')
        .toLowerCase();

    if (!clean) return null;
    if (POS_NORMALIZATION_MAP[clean]) {
        return POS_NORMALIZATION_MAP[clean];
    }
    // 复合词性如 vt&vi, vi&n
    if (clean.includes('&')) {
        const parts = clean.split('&').map(s => s.trim());
        const normParts = parts
            .map(p => POS_NORMALIZATION_MAP[p] || (['n', 'v', 'adj', 'adv', 'prep', 'conj', 'pron'].includes(p) ? p : null))
            .filter(Boolean);
        if (normParts.length === parts.length) {
            return Array.from(new Set(normParts)).join('/');
        }
    }
    // 标准英文 1-6 字母纯词性
    if (/^[a-z]{1,6}$/.test(clean)) {
        return clean;
    }
    return null;
};

/**
 * 提取去重并格式化词性列表（过滤掉非英文词性）
 */
export const getUniquePos = (trans: [string, string][] | undefined): string[] => {
    if (!trans) return [];
    const posSet = new Set<string>();
    trans.forEach(t => {
        if (t && t[0]) {
            const norm = normalizePos(t[0]);
            if (norm) {
                posSet.add(norm);
            }
        }
    });
    return Array.from(posSet);
};

/**
 * 格式化释义列表中的词性展示
 */
export const formatDefinitionPos = (rawPos: string): string => {
    if (!rawPos) return '';
    const clean = rawPos.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim().replace(/\.$/, '');
    if (!/^[a-zA-Z&/-]+$/.test(clean)) {
        return '';
    }
    return clean;
};

/**
 * 格式化释义内容（兜底处理历史脏数据中的前缀释义）
 */
export const formatDefinitionContent = (item: [string, string]): string => {
    const rawPos = (item[0] || '').replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim().replace(/\.$/, '');
    const def = (item[1] || '').replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
    if (!rawPos) return def;
    if (!/^[a-zA-Z&/-\s]+$/.test(rawPos)) {
        return `${rawPos} ${def}`.trim();
    }
    return def;
};

/**
 * 根据词性返回 Emoji 装饰图标
 */
export const getPosIcon = (pos: string): string => {
    const p = pos.toLowerCase();
    if (p.includes('noun') || p === 'n') return '📝';
    if (p.includes('verb') || p === 'v') return '⚡';
    if (p.includes('adj') || p === 'a') return '✨';
    if (p.includes('adv') || p === 'ad') return '🚀';
    if (p.includes('prep')) return '🔗';
    if (p.includes('conj')) return '🔀';
    if (p.includes('pron')) return '👤';
    return '🏷️';
};
