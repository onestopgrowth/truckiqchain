export type Row<T extends Record<string, any>> = T & { id?: string };

class Store<T extends Record<string, any>> {
  rows: Row<T>[] = [];
}

class Query<T extends Record<string, any>> {
  constructor(private store: Store<T>) {}
  private filters: ((r: Row<T>) => boolean)[] = [];
  private _limit: number | null = null;
  private _cols: string | undefined;

  eq<K extends keyof Row<T>>(key: K, val: any) {
    this.filters.push((r) => (r as any)[key] === val);
    return this;
  }
  in<K extends keyof Row<T>>(key: K, arr: any[]) {
    this.filters.push((r) => arr.includes((r as any)[key]));
    return this;
  }
  order(_key: keyof T, _opts?: any) {
    // no-op sort for now
    return this;
  }
  limit(n: number) {
    this._limit = n;
    return this;
  }
  select(cols?: string) {
    this._cols = cols;
    return this;
  }
  private compute() {
    let data = this.store.rows.filter((r) => this.filters.every((f) => f(r)));
    if (this._limit != null) data = data.slice(0, this._limit);
    // Optionally project columns (best-effort; ignore nested paths)
    if (this._cols && this._cols !== "*") {
      const keys = this._cols.split(",").map((s) => s.trim().split(" ")[0]);
      data = data.map((r) => {
        const o: any = {};
        for (const k of keys) if (k in r) o[k] = (r as any)[k];
        return o as Row<T>;
      });
    }
    return data;
  }
  // Allow `await query` to yield { data, error } like Supabase
  then<TResult1 = any, TResult2 = any>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | undefined,
    _onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined
  ) {
    const result = { data: this.compute(), error: null };
    return Promise.resolve(onfulfilled ? onfulfilled(result) : (result as any));
  }
  single() {
    const data = this.compute();
    if (!data.length) return { data: null, error: { message: "not_found" } };
    return { data: data[0], error: null };
  }
  maybeSingle() {
    const data = this.compute();
    return { data: data[0] || null, error: null };
  }
  update(vals: Partial<T>) {
    const arr = this.store.rows.filter((r) => this.filters.every((f) => f(r)));
    arr.forEach((r) => Object.assign(r, vals));
    const self = this;
    return {
      data: arr,
      error: null,
      single() {
        return { data: arr[0] || null, error: arr.length ? null : { message: "not_found" } } as any;
      },
    } as any;
  }
  insert(obj: T | T[]) {
    const arr = Array.isArray(obj) ? obj : [obj];
    const withIds = arr.map((r) => ({ id: crypto.randomUUID(), ...r }));
    this.store.rows.push(...withIds);
    return {
      data: withIds.length === 1 ? withIds[0] : withIds,
      error: null,
      single() {
        return { data: withIds[0], error: null } as any;
      },
    } as any;
  }
}

export class FakeSupabase {
  tables: Record<string, Store<any>> = {};
  constructor(public userId: string) {}
  from<T extends Record<string, any>>(name: string) {
    if (!this.tables[name]) this.tables[name] = new Store<T>();
    return new Query<T>(this.tables[name]);
  }
  auth = {
    getUser: async () => ({ data: { user: { id: this.userId, email: "t@e.st" } } }),
  };
}
