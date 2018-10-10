export function UUID() { // Public Domain/MIT
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export class Later<T> {
    resolve!: (value?: T | PromiseLike<T>) => void;
    reject!: (reason?: any) => void;
    promise: Promise<T>;
    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.reject = reject
            this.resolve = resolve
        })
    } 
}


declare global {


    type Dictionary<T> = { [key: string]: T };

    type Constructor<T> = new (...args: any[]) => T;

    interface IGroup<U, T> {
        key: U;
        list: T[]
    }

    interface ObjectConstructor {
        equals(first: any, second: any): boolean;
        isObject(obj: any): boolean;
        isNumber(obj: any): boolean;
        in(...args: any[]): boolean;
    }

    interface DateConstructor {
        isDate(value: any): boolean;
    }

    interface Array<T> {
        distinct(predicate?: (value: T) => any): Array<T>;
        remove(element: any): void;
        removeIndex(index: number): void;
        max(def?: number): number | undefined;
        multi<U>(predicate: (value: T) => U[]): Array<U>;
        mapMany<U>(predicate: (value: T) => U[]): Array<U>;
        orderBy<U>(predicate: (value: T) => U): Array<T>;
        each<U>(predicate: (value: T, index: number) => void): Array<T>;
        except(list: T[], predicate?: (value: T) => any): T[];
        sum(predicate?: (value: T) => number): number;
        any(predicate?: (value: T) => boolean): boolean;
        first(): T;
        last(): T | undefined;
        firstNotNull(): T;
        notNull(): Array<T>;
        group<U>(predicate: (value: T) => U): IGroup<U, T>[];
        removeBy(predicate: (value: T, index: number, list?: T[]) => boolean): void;
        setPrototypeOf(proto: object): Array<T>;
    }

    interface String {
        toNumber(): number;
        replaceAll(search: string, replacer?: string): string;
    }

    interface Number {
        pad(number?: number): string;
    }
}

if (!Number.prototype.pad) {
    Number.prototype.pad = function (number?: number): string {
        var s = String(this);
        while (s.length < (number || 2)) { s = "0" + s; }
        return s;
    }
}

if (!String.prototype.toNumber) {
    String.prototype.toNumber = function (): number {
        return parseInt(this);
    }
}

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search: string, replacer: string): string {
        var target = this;
        return target.split(search).join(replacer || "");
    }
}


if (!Date.isDate) {
    Date.isDate = function (value: any): any {
        // 2018-09-10T13:55:56.284Z
        if (value && value.toString().match(/\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(:\d\d\d)?Z/)) {
            return true;
        }
        return false;
    }
}

if (!Object.isObject) {
    Object.isObject = function (obj: any): boolean {
        return obj !== null && obj !== undefined && typeof obj == 'object';
    }
}

if (!Object.isNumber) {
    Object.isNumber = function (obj: any): boolean {
        return obj !== undefined && obj !== null && !isNaN(Number(obj));
    }
}

if (!Object.in) {
    Object.in = function (...obj: any[]): boolean {
        if (obj && obj.length) {
            return obj.includes(this);
        }
        return false;
    }
}

if (!Object.equals) {
    Object.equals = function (first: any, second: any): boolean {
        if (first === null || second === null || first === undefined || second === undefined)
            return false;
        if (typeof (first) == 'object' && typeof (second) == 'object') {
            if (first.equals && second.equals) {
                return first.equals(second);
            }
        }
        return first == second;
    }
}


if (!Array.prototype.first) {
    Array.prototype.first = function () {
        return this.length ? this[0] : null;
    }
}

if (!Array.prototype.last) {
    Array.prototype.last = function () {
        if (this.length) {
            return this[this.length - 1];
        }
    }
}


if (!Array.prototype.except) {
    Array.prototype.except = function (array: Array<any>, predicate?: (value: any) => any): Array<any> {
        let self: Array<any> = this;
        if (self.length == 0) return [];
        if (array.length == 0) return this;
        let result = self.filter(x => {
            let hasEqual = true;

            if (predicate) {
                hasEqual = array.find(y => predicate(y) == predicate(x));
            } else {
                if (typeof x == 'object') {
                    hasEqual = array.find(y => ('equals' in y) ? y.equals(x) : y == x);
                } else {
                    hasEqual = array.find(y => y == x);
                }
            }

            if (hasEqual) {
                return false;
            }
            return true;
        });
        return result;
    }
}


if (!Array.prototype.firstNotNull) {
    Array.prototype.firstNotNull = function () {
        return this.filter((x: any) => x != null).first();
    }
}

if (!Array.prototype.setPrototypeOf) {
    Array.prototype.setPrototypeOf = function (proto: Object) {
        for (let i = 0; i < this.length; i++) {
            let e = this[i];
            if (e) {
                Object.setPrototypeOf(e, proto);
            }
        }
        return this;
    }
}


if (!Array.prototype.notNull) {
    Array.prototype.notNull = function () {
        return this.filter((x: any) => x !== null);
    }
}


if (!Array.prototype.group) {
    Array.prototype.group = function (predicate: any): any {
        let map: any = {};
        let groups = [];
        for (let i of this) {
            let key = predicate(i);
            if (!(key in map)) {
                map[key] = {
                    key,
                    list: []
                }
                groups.push(map[key]);
            }
            let group = map[key];
            group.list.push(i);
        }
        return groups;
    }
}

if (!Array.prototype.orderBy) {
    Array.prototype.orderBy = function (predicate: (value: any) => any): Array<any> {
        let self: Array<any> = this.slice();
        self.sort((a: any, b: any) => {
            let av = predicate(a);
            let bv = predicate(b);
            return av > bv ? 1 : av < bv ? -1 : 0;
        })
        return self;
    }
}


if (!Array.prototype.multi) {
    Array.prototype.multi = function (predicate) {
        let self: Array<any> = this;
        if (self.length == 0)
            return [];
        let result = self.reduce((p, c) => [...p, ...predicate(c)], predicate(self[0]));
        return result;
    }
}

if (!Array.prototype.mapMany) {
    Array.prototype.mapMany = Array.prototype.multi;
}


if (!Array.prototype.max) {
    Array.prototype.max = function (def?: number): number | undefined {
        let self: Array<number> = this;
        if (self.length == 0) {
            if (def !== undefined)
                return def;

        } else {
            return self.reduce((p: number, c: number) => p > c ? p : c);
        }
    }
}

if (!Array.prototype.sum) {
    Array.prototype.sum = function (predicate?: (value: any) => number): number {
        let self: Array<number> = this;
        if (self.length == 0) {
            return 0;
        }
        if (predicate) {
            return self.reduce((p: number, c: number) => p + predicate(c), predicate(self[0]));
        }
        return self.reduce((p: number, c: number) => p + c);
    }
}

if (!Array.prototype.any) {
    Array.prototype.any = function (predicate?: (value: any) => boolean): boolean {
        let self: Array<number> = this;
        if (self.length == 0) {
            return false;
        } else if (predicate !== undefined) {
            return self.filter(predicate).any();
        }
        return true;
    }
}

if (!Array.prototype.remove) {
    Array.prototype.remove = function (element: any) {
        let index = this.indexOf(element);
        if (index >= 0)
            this.splice(index, 1);
    }
}

if (!Array.prototype.removeIndex) {
    Array.prototype.removeIndex = function (index: number) {
        if (index >= 0)
            this.splice(index, 1);
    }
}


if (!Array.prototype.removeBy) {
    Array.prototype.removeBy = function (predicate: (value: any, index: number, list?: any[]) => boolean) {
        let toRemove = this.filter(predicate);
        for (let item of toRemove) {
            this.remove(item);
        }
    }
}

if (!Array.prototype.distinct) {
    Array.prototype.distinct = function <T>(predicate?: (value: T) => any): Array<T> {
        if (!predicate) {
            return [...new Set<T>(this)];
        }
        let set = new Set();
        let self: Array<T> = this;
        let res: T[] = [];
        self.forEach(e => {
            let key = predicate(e);
            if (!set.has(key)) {
                res.push(e);
                set.add(key);
            }
        });
        return res;
    }
}
