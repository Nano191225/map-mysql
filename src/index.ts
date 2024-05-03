import mysql from "mysql";

export default class Database<K extends string, V> extends Map<string, V> {
    private static connection: mysql.Connection;
    private tableName: string;
    private ready = false;

    constructor(tableName: string) {
        super();
        this.tableName = tableName;

        const connection = Database.connection;
        connection.query(`CREATE TABLE IF NOT EXISTS ${this.tableName} (\`key\` VARCHAR(128) PRIMARY KEY, value TEXT)`, (error, results, fields) => {
            if (error) throw error;
        });

        this.load();
        this.ready = true;
    }

    public load() {
        super.clear();
        const connection = Database.connection;
        connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
            if (error) throw error;
            results.forEach((result: any) => {
                super.set(result.key, result.value);
            });
        });
    }

    public async loadAsync(): Promise<void> {
        return new Promise((resolve, reject) => {
            super.clear();
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error) reject(error);
                results.forEach((result: any) => {
                    super.set(result.key, result.value);
                });
                resolve();
            });
        });
    }

    public set(key: K, value: V): this {
        if (!this.ready) throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        value = JSON.stringify(value) as V;
        super.set(key, value);

        const connection = Database.connection;
        connection.query(`REPLACE INTO ${this.tableName} (\`key\`, value) VALUES (?, ?)`, [key, value], (error, results, fields) => {
            if (error) throw error;
        });

        return this;
    }

    public async setAsync(key: K, value: V): Promise<this> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            value = JSON.stringify(value) as V;
            super.set(key, value);

            const connection = Database.connection;
            connection.query(`REPLACE INTO ${this.tableName} (\`key\`, value) VALUES (?, ?)`, [key, value], (error, results, fields) => {
                if (error) reject(error);
                resolve(this);
            });
        });
    }
    
    public delete(key: K): boolean {
        if (!this.ready) throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        super.delete(key);

        const connection = Database.connection;
        connection.query(`DELETE FROM ${this.tableName} WHERE \`key\` = ?`, [key], (error, results, fields) => {
            if (error) throw error;
        });

        return true;
    }

    public async deleteAsync(key: K): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            super.delete(key);

            const connection = Database.connection;
            connection.query(`DELETE FROM ${this.tableName} WHERE \`key\` = ?`, [key], (error, results, fields) => {
                if (error) reject(error);
                resolve(true);
            });
        });
    }

    public clear(): void {
        if (!this.ready) throw new Error("Database is not ready yet.");
        super.clear();

        const connection = Database.connection;
        connection.query(`DELETE FROM ${this.tableName}`, (error, results, fields) => {
            if (error) throw error;
        });
    }

    public async clearAsync(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            super.clear();

            const connection = Database.connection;
            connection.query(`DELETE FROM ${this.tableName}`, (error, results, fields) => {
                if (error) reject(error);
                resolve();
            });
        });
    }

    public has(key: K): boolean {
        if (!this.ready) throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        return super.has(key);
    }

    public async hasAsync(key: K): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            resolve(super.has(key));
        });
    }

    public getRaw(key: K): string | undefined {
        if (!this.ready) throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        return super.get(key) as string;
    }

    public async getRawAsync(key: K): Promise<string | undefined> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            resolve(super.get(key) as string);
        });
    }

    public get(key: K): V | undefined {
        if (!this.ready) throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        return JSON.parse(super.get(key) as string);
    }

    public async getAsync(key: K): Promise<V | undefined> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            resolve(JSON.parse(super.get(key) as string));
        });
    }

    public keysRaw(): IterableIterator<string> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return super.keys();
    }

    public async keysRawAsync(): Promise<IterableIterator<string>> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            resolve(super.keys());
        });
    }

    public keys(): IterableIterator<K> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return this.parseArray(super.keys());
    }

    public async keysAsync(): Promise<IterableIterator<K>> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            resolve(this.parseArray(super.keys()));
        });
    }

    public valuesRaw(): IterableIterator<unknown> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return super.values();
    }

    public async valuesRawAsync(): Promise<IterableIterator<unknown>> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            resolve(super.values());
        });
    }

    public values(): IterableIterator<V> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return this.parseArray(super.values());
    }

    public async valuesAsync(): Promise<IterableIterator<V>> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            resolve(this.parseArray(super.values()));
        });
    }

    public entriesRaw(): IterableIterator<[string, unknown]> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return super.entries();
    }

    public async entriesRawAsync(): Promise<IterableIterator<[string, unknown]>> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            resolve(super.entries());
        });
    }

    public entries(): IterableIterator<[K, V]> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return this.parseEntries(super.entries());
    }

    public async entriesAsync(): Promise<IterableIterator<[K, V]>> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            resolve(this.parseEntries(super.entries()));
        });
    }

    public forEachRaw(callbackfn: (value: unknown, key: string, map: Map<string, V>) => void, thisArg?: any): void {
        if (!this.ready) throw new Error("Database is not ready yet.");
        super.forEach(callbackfn, thisArg);
    }

    public async forEachRawAsync(callbackfn: (value: unknown, key: string, map: Map<string, V>) => void, thisArg?: any): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            super.forEach(callbackfn, thisArg);
            resolve();
        });
    }

    public forEach(callbackfn: (value: V, key: string, map: Map<string, V>) => void, thisArg?: any): void {
        if (!this.ready) throw new Error("Database is not ready yet.");
        super.forEach((value, key, map) => {
            callbackfn(JSON.parse(value as string), key, map);
        }, thisArg);
    }

    public async forEachAsync(callbackfn: (value: V, key: string, map: Map<string, V>) => void, thisArg?: any): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady()) reject(new Error("Database is not ready yet."));
            super.forEach((value, key, map) => {
                callbackfn(JSON.parse(value as string), key, map);
            }, thisArg);
            resolve();
        });
    }

    private sanitize(key: K): K {
        if (!key.length) throw new Error("Key must not be empty.");
        key = key.replace(/[^a-zA-Z0-9_]/g, (match) => {
            if (match === "'") return "''";
            if (match === "\\") return "\\\\";
            if (match === " ") return "_";
            return `${match.charCodeAt(0).toString(16)}`.padStart(5, "u0000");
        }) as K;
        if (key.length > 255) throw new Error("Key must not be longer than 255 characters.");
        return key;
    }

    public waitReady(): Promise<this> {
        const start = Date.now();
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (this.ready) {
                    clearInterval(interval);
                    resolve(this);
                } else if (Date.now() - start > 10000) {
                    clearInterval(interval);
                    reject(new Error("Database is not ready yet."));
                }
            }, 100);
        });
    }

    private parseArray(array: IterableIterator<any>): IterableIterator<any> {
        const parsed: any[] = [];
        for (const value of array) {
            if (typeof value === "string") {
                parsed.push(JSON.parse(value));
            } else {
                parsed.push(JSON.stringify(value));
            }
        }
        return parsed[Symbol.iterator]();
    }

    private parseEntries(array: IterableIterator<[any, any]>): IterableIterator<[any, any]> {
        const parsed: any[] = [];
        for (const [key, value] of array) {
            parsed.push([key, JSON.parse(value)]);
        }
        return parsed[Symbol.iterator]();
    }

    public static connect(host: string, user: string, password: string, database: string) {
        try {
            Database.connection = mysql.createConnection({
                host: host,
                user: user,
                password: password,
                database: database
            });
        } catch (error) {
            if ((error as any).code === "ER_NO_DB_ERROR") {
                Database.connection = mysql.createConnection({
                    host: host,
                    user: user,
                    password: password
                });

                Database.connection.connect();
                Database.connection.query(`CREATE DATABASE IF NOT EXISTS ${database}`, (error, results, fields) => {
                    if (error) throw error;
                });
                Database.connection.end();
                Database.connect(host, user, password, database);
            } else {
                throw error;
            }
            return;
        }

        Database.connection.connect();

        setInterval(() => {
            Database.reconnect();
        }, 1000 * 60 * 60); // 1 hour
    }

    public static disconnect() {
        Database.connection.end();
    }

    public static reconnect() {
        Database.connection.end();
        Database.connection.connect();
    }

    public static isConnected(): boolean {
        return Database.connection.state === "authenticated" || Database.connection.state === "connected";
    }
}

(async () => {
    /* Example usage */
    Database.connect("localhost", "root", "password", "test");
    const db = new Database("test");
    (await db.waitReady()).set("key", "value");
    console.log(db.get("key"));
    db.delete("key");
})();