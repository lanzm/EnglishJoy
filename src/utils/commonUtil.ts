// 通用方法
import multiavatar from '@multiavatar/multiavatar';

const wordBookList = [
    {
        label: '四级词汇',
        value: 'CET4luan_1',
    },
    {
        label: '六级词汇',
        value: 'CET6luan_1',
    },
    {
        label: '考研词汇',
        value: 'KaoYanluan_1',
    },
    {
        label: '雅思词汇',
        value: 'IELTSluan_2',
    },
]

export default {
    wordBookList,
    msg(title: any, icon: any = "none", mask: boolean = false, duration = 2000) {
        uni.showToast({
            title,
            duration,
            mask,
            icon,
        });
    },
    loading(title = '加载中...', mask = true) {
        uni.showLoading({
            title: title,
            mask: mask,
        });
    },
    getCurrWordBook() {
        const _wordBook = uni.getStorageSync('wordBook');
        if (_wordBook) {
            return wordBookList.find((e) => e.value === _wordBook);
        } else {
            return wordBookList[3]
        }
    },
    randomName(min: number, max: number) {
        const _max = Math.floor(Math.random() * (max - min + 1)) + min;
        const nameStr = 'abcdefghizklmnopqrstuvwxyz';
        let userName = '';
        for (let i = 0; i < _max; i++) {
            userName += nameStr[Math.floor(Math.random() * nameStr.length)];
        }
        const _avatar = multiavatar(userName);
        return {
            userName: userName,
            avatar:  'data:image/svg+xml;base64,' + this.base64encode(unescape(encodeURIComponent(_avatar)))
        }
    },
    base64encode(str: string) {
        let out = '';
        let i = 0;
        const len = str.length;
        const base64EncodeChars =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

        while (i < len) {
            const c1 = str.charCodeAt(i++) & 0xff;
            if (i === len) {
                out += base64EncodeChars.charAt(c1 >> 2);
                out += base64EncodeChars.charAt((c1 & 0x3) << 4);
                out += '==';
                break;
            }
            const c2 = str.charCodeAt(i++);
            if (i === len) {
                out += base64EncodeChars.charAt(c1 >> 2);
                out += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
                out += base64EncodeChars.charAt((c2 & 0xf) << 2);
                out += '=';
                break;
            }
            const c3 = str.charCodeAt(i++);
            out += base64EncodeChars.charAt(c1 >> 2);
            out += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
            out += base64EncodeChars.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6));
            out += base64EncodeChars.charAt(c3 & 0x3f);
        }
        return out;
    },
}
