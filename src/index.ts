import mysql from "mysql";

export default class Database<K extends string, V> extends Map<string, V> {
    private static connection: mysql.Connection;
    private static customPaths: string[] = [];
    private static customPath = false;
    private tableName: string;
    private _values: string;
    private ready = false;
    private _path: string;
    private _questionMarks: string;

    constructor(tableName: string) {
        super();
        this.tableName = tableName;

        const connection = Database.connection;
        let values = "value TEXT";
        if (Database.customPath) {
            values = "";
            Database.customPaths.forEach((value) => {
                values += `${value} TEXT, `.replace(/\./g, "$");
            });
            values = values.slice(0, -2);
        }
        this._values = values;
        connection.query(`CREATE TABLE IF NOT EXISTS ${this.tableName} (\`key\` VARCHAR(128) PRIMARY KEY, ${values})`, (error, results, fields) => {
            if (error) throw error;
        });

        this._path = "`key`, " + (Database.customPath ? Database.customPaths.join(", ").replace(/\./g, "$") : "value");
        this._questionMarks = "?, " + (Database.customPath ? Database.customPaths.map(() => "?").join(", ") : "?");

        this.load();
        
    }

    public load() {
        super.clear();
        const connection = Database.connection;
        connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
            if (error) throw error;
            if (Database.customPath) {
                results.forEach((result: any) => {
                    try {
                        const value = this.mergeValues(result);
                        super.set(result.key, JSON.stringify(value) as V);
                    } catch {
                        super.set(result.key, undefined as V);
                    }
                });
            } else {
                results.forEach((result: any) => {
                    console.log(result);
                    super.set(result.key, result.value);
                });
            }
        });
        this.ready = true;
    }

    public async loadAsync(): Promise<void> {
        return new Promise((resolve, reject) => {
            super.clear();
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error) reject(error);
                if (Database.customPath) {
                    results.forEach((result: any) => {
                        const value = this.mergeValues(result);
                        super.set(result.key, JSON.stringify(value) as V);
                    });
                } else {
                    results.forEach((result: any) => {
                        super.set(result.key, result.value);
                    });
                }
                this.ready = true;
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
        if (Database.customPath) {
            const newValue = this.extractValues(JSON.parse(value as string));
            const values: any[] = Object.values(newValue).map((v) => JSON.stringify(v));
            const query = `REPLACE INTO ${this.tableName} (${this._path}) VALUES (${this._questionMarks})`;
            connection.query(query, [key, ...values], (error, results, fields) => {
                if (error) throw error;
            });
        } else {
            connection.query(`REPLACE INTO ${this.tableName} (\`key\`, value) VALUES (?, ?)`, [key, value], (error, results, fields) => {
                if (error) throw error;
            });
        }

        return this;
    }

    public async setAsync(key: K, value: V): Promise<this> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            value = JSON.stringify(value) as V;
            super.set(key, value);

            const connection = Database.connection;
            if (Database.customPath) {
                const newValue = this.extractValues(JSON.parse(value as string));
                const values: any[] = Object.values(newValue).map((v) => JSON.stringify(v));
                const query = `REPLACE INTO ${this.tableName} (${this._path}) VALUES (${this._questionMarks})`;
                connection.query(query, [key, ...values], (error, results, fields) => {
                    if (error) reject(error);
                    resolve(this);
                });
            } else {
                connection.query(`REPLACE INTO ${this.tableName} (\`key\`, value) VALUES (?, ?)`, [key, value], (error, results, fields) => {
                    if (error) reject(error);
                    resolve(this);
                });
            }
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
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
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
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
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
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            const data1 = super.has(key);
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName} WHERE \`key\` = ?`, [key], (error, results, fields) => {
                if (error) reject(error);
                const data2 = results.length > 0;
                if (data1 !== data2) return reject(new Error("Database integrity error."));
                resolve(data1);
            });
        });
    }

    public getRaw(key: K): string | undefined {
        if (!this.ready) throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        return super.get(key) as string;
    }

    public async getRawAsync(key: K): Promise<string | undefined> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            const data1 = super.get(key);
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName} WHERE \`key\` = ?`, [key], (error, results, fields) => {
                if (error) reject(error);
                const data2 = results[0];
                if (data1 !== data2) return reject(new Error("Database integrity error."));
                resolve(data1 as string);
            });
        });
    }

    public get(key: K): V | undefined {
        if (!this.ready) throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        try {
            return JSON.parse(super.get(key) as string) as V;
        } catch (error) {
            return super.get(key) as V;
        }
    }

    public async getAsync(key: K): Promise<V | undefined> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            const data1 = this.isSafeJson("parse", super.get(key)) ? JSON.parse(super.get(key) as string) : super.get(key);
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName} WHERE \`key\` = ?`, [key], (error, results, fields) => {
                if (error) reject(error);
                if (Database.customPath) {
                    try {
                        const data2 = this.mergeValues(results[0]);
                        if (JSON.stringify(data1) !== JSON.stringify(data2)) return reject(new Error("Database integrity error."));
                    } catch (error) {
                        if (results.length > 0)
                            return reject(new Error("Database integrity error."));
                        return resolve(undefined);
                    }
                } else {
                    const data2 = results[0].value;
                    if (JSON.stringify(data1) !== data2) return reject(new Error("Database integrity error."));
                }
                resolve(data1 as V);
            });
        });
    }

    public keys(): IterableIterator<K> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return super.keys() as IterableIterator<K>;
    }

    public async keysAsync(): Promise<IterableIterator<K>> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            const data1 = [...super.keys()];
            const connection = Database.connection;
            connection.query(`SELECT \`key\` FROM ${this.tableName}`, (error, results, fields) => {
                if (error) reject(error);
                const data2 = results.map((result: any) => result.key);
                if (JSON.stringify(data1) !== JSON.stringify(data2)) return reject(new Error("Database integrity error."));
                resolve(data1[Symbol.iterator]() as IterableIterator<K>);
            });
        });
    }

    public valuesRaw(): IterableIterator<V> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return super.values();
    }

    public async valuesRawAsync(): Promise<IterableIterator<V>> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            const data1 = [...super.values()];
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error) reject(error);
                if (Database.customPath) {
                    try {
                        const data2 = results.map((result: any) => JSON.stringify(this.mergeValues(result)));
                        console.log(data1, data2)
                        if (JSON.stringify(data1) !== JSON.stringify(data2)) return reject(new Error("Database integrity error."));
                    } catch {
                        return reject(new Error("Database integrity error."));
                    }
                } else {
                    const data2 = results.map((result: any) => result.value);
                    if (JSON.stringify(data1) !== JSON.stringify(data2)) return reject(new Error("Database integrity error."));
                }
                resolve(data1[Symbol.iterator]() as IterableIterator<V>);
            });
        });
    }

    public values(): IterableIterator<V> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return this.parseArray(super.values());
    }

    public async valuesAsync(): Promise<IterableIterator<V>> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            const data1 = [...super.values()];
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error) reject(error);
                if (Database.customPath) {
                    const data2 = results.map((result: any) => JSON.stringify(this.mergeValues(result)));
                    if (JSON.stringify(data1) !== JSON.stringify(data2)) return reject(new Error("Database integrity error."));
                } else {
                    const data2 = results.map((result: any) => result.value);
                    if (JSON.stringify(data1) !== JSON.stringify(data2)) return reject(new Error("Database integrity error."));
                }
                resolve(this.parseArray(data1[Symbol.iterator]()));
            });
        });
    }

    public entriesRaw(): IterableIterator<[string, unknown]> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return super.entries();
    }

    public async entriesRawAsync(): Promise<IterableIterator<[string, unknown]>> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            const data1 = [...super.entries()];
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error) reject(error);
                if (Database.customPath) {
                    try {
                        const data2 = results.map((result: any) => [result.key, JSON.stringify(this.mergeValues(result))]);
                        if (JSON.stringify(data1) !== JSON.stringify(data2)) return reject(new Error("Database integrity error."));
                    } catch {
                        resolve(data1[Symbol.iterator]() as IterableIterator<[string, unknown]>);
                    }
                } else {
                    const data2 = results.map((result: any) => [result.key, result.value]);
                    if (JSON.stringify(data1) !== JSON.stringify(data2)) return reject(new Error("Database integrity error."));
                }
                resolve(data1[Symbol.iterator]() as IterableIterator<[string, unknown]>);
            });
        });
    }

    public entries(): IterableIterator<[K, V]> {
        if (!this.ready) throw new Error("Database is not ready yet.");
        return this.parseEntries(super.entries());
    }

    public async entriesAsync(): Promise<IterableIterator<[K, V]>> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            const data1 = [...super.entries()];
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error) reject(error);
                if (Database.customPath) {
                    const data2 = results.map((result: any) => [result.key, JSON.stringify(this.mergeValues(result))]);
                    if (JSON.stringify(data1) !== JSON.stringify(data2)) return reject(new Error("Database integrity error."));
                } else {
                    const data2 = results.map((result: any) => [result.key, result.value]);
                    if (JSON.stringify(data1) !== JSON.stringify(data2)) return reject(new Error("Database integrity error."));
                }
                resolve(this.parseEntries(data1[Symbol.iterator]()));
            });
        });
    }

    public forEachRaw(callbackfn: (value: unknown, key: string, map: Map<string, V>) => void, thisArg?: any): void {
        if (!this.ready) throw new Error("Database is not ready yet.");
        super.forEach(callbackfn, thisArg);
    }

    public async forEachRawAsync(callbackfn: (value: unknown, key: string, map: Map<string, V>) => void, thisArg?: any): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            super.forEach(callbackfn, thisArg);
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
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            super.forEach((value, key, map) => {
                callbackfn(JSON.parse(value as string), key, map);
            }, thisArg);
            resolve();
        });
    }

    public query(query: string): any {
        if (!this.ready) throw new Error("Database is not ready yet.");
        const connection = Database.connection;
        return connection.query(query, (error, results, fields) => {
            if (error) throw error;
            return results;
        });
    }

    public async queryAsync(query: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady())) reject(new Error("Database is not ready yet."));
            const connection = Database.connection;
            connection.query(query, (error, results, fields) => {
                if (error) reject(error);
                resolve(results);
            });
        });
    }

    private extractValues(value: object): { [key: string]: any } {
        const values: { [key: string]: any } = {};
        for (const path of Database.customPaths) {
            const keys = path.split(".");
            let temp: any = JSON.parse(JSON.stringify(value));
            for (const key of keys) {
                if (temp[key] !== undefined) {
                    temp = temp[key];
                } else {
                    temp = undefined;
                    break;
                }
            }
            values[path] = temp;
        }
        return values;
    }

    /**
     * 
     * {
     *   "key": "a",
     *   "name": '"John Doe"',
     *   "age": '42',
     *   "birthday": '"1970-01-01"',
     *   "parents$father": '"John Doe Sr."',
     *   "parents$mother": '"Jane Doe"'
     * }
     * to
     * {
     *   "name": "John Doe",
     *   "age": 42,
     *   "birthday": "1970-01-01",
     *   "parents": {
     *      "father": "John Doe Sr.",
     *      "mother": "Jane Doe"
     *   }
     * }
     */
    private mergeValues(values: { [key: string]: any }): any {
        const value: any = {};
        for (const [key, val] of Object.entries(values)) {
            if (key === "key") continue;
            const keys = key.split("$");
            if (keys.length === 1) {
                value[keys[0]] = JSON.parse(val);
            } else {
                let temp: any = value;
                for (let i = 0; i < keys.length; i++) {
                    if (i === keys.length - 1) {
                        temp[keys[i]] = JSON.parse(val);
                    } else {
                        if (temp[keys[i]] === undefined) {
                            temp[keys[i]] = {};
                        }
                        temp = temp[keys[i]];
                    }
                }
            }
        }
        return value;
    }

    private isSafeJson(check: "parse" | "stringify", value: any): boolean {
        try {
            if (check === "parse") {
                JSON.parse(value);
            } else {
                JSON.stringify(value);
            }
            return true;
        } catch (error) {
            return false;
        }
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
                parsed.push(value);
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

    public static connect(host: string, user: string, password: string, database: string, autoReconnect: number = 1000 * 60 * 60) {
        try {
            Database.connection = mysql.createConnection({
                host: host,
                user: user,
                password: password,
                database: database,
            });
        } catch (error) {
            if ((error as any).code === "ER_NO_DB_ERROR") {
                Database.connection = mysql.createConnection({
                    host: host,
                    user: user,
                    password: password,
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

        if (autoReconnect > 0) setInterval(() => {
            Database.reconnect();
        }, autoReconnect);
    }

    public static disconnect() {
        Database.connection.end();
    }

    public static reconnect() {
        const connection = Database.connection;
        connection.query("SELECT 1", (error, results, fields) => {
            connection.end();
            Database.connection = mysql.createConnection(connection.config);
            Database.connection.connect();
            Database.connection.query("SELECT 1", (error, results, fields) => {
                if (error) throw error;
            });    
        });
    }

    public static isConnected(): boolean {
        return Database.connection.state === "authenticated" || Database.connection.state === "connected";
    }

    public static setJsonPath(path: string): void {
        Database.customPaths.push(path);
        Database.customPath = true;
    }
}

(async () => {
    /* Example usage */
    Database.connect("192.168.1.42", "root", "1225", "test");
    Database.setJsonPath("name");
    Database.setJsonPath("age");
    Database.setJsonPath("birthday");
    Database.setJsonPath("parents.father");
    Database.setJsonPath("parents.mother");
    const db = new Database("test");
    const data = {
        name: "John Doe",
        age: 42,
        birthday: "1970-01-01",
        parents: {
            father: "John Doe Sr.",
            mother: "Jane Doe",
        },
    };
    
    await db.waitReady();
    console.log("Ready");

    console.log("Set check ".padEnd(50, "-"));

    for (let i = 0; i < 100; i++) {
        console.log("Set " + i);
        if (i < 99) {
            db.set(i.toString().padStart(6, "id0000"), { ...data, age: i });
        } else {
            await db.setAsync(i.toString().padStart(6, "id0000"), { ...data, age: i });
        }
    }

    console.log("Clear");
    await wait(1000);

    console.log("Keys check 1 ".padEnd(50, "-"));
    console.log(db.keys());
    console.log("Keys check 2 ".padEnd(50, "-"));
    console.log(await db.keysAsync());

    console.log("Values check 1 ".padEnd(50, "-"));
    console.log(db.valuesRaw());
    console.log("Values check 2 ".padEnd(50, "-"));
    console.log(await db.valuesRawAsync());
    console.log("Values check 3 ".padEnd(50, "-"));
    console.log(db.values());
    console.log("Values check 4 ".padEnd(50, "-"));
    console.log(await db.valuesAsync());

    console.log("Entries check ".padEnd(50, "-"));
    console.log(db.entriesRaw());
    console.log("Entries check 2 ".padEnd(50, "-"));
    console.log(await db.entriesRawAsync());
    console.log("Entries check 3 ".padEnd(50, "-"));
    console.log(db.entries());
    console.log("Entries check 4 ".padEnd(50, "-"));
    console.log(await db.entriesAsync());

    console.log("Has check 1A ".padEnd(50, "-"));
    console.log(db.has("id0000"));
    console.log("Has check 1B ".padEnd(50, "-"));
    console.log(await db.hasAsync("id0001"));

    console.log("Get check 1A ".padEnd(50, "-"));
    console.log(db.get("id0000"));
    console.log("Get check 1B ".padEnd(50, "-"));
    console.log(await db.getAsync("id0001"));

    console.log("Delete check 1 ".padEnd(50, "-"));
    console.log(db.delete("id0000"));
    console.log("Delete check 2 ".padEnd(50, "-"));
    console.log(await db.deleteAsync("id0001"));

    console.log("Has check 2A ".padEnd(50, "-"));
    console.log(db.has("id0000"));
    console.log("Has check 2B ".padEnd(50, "-"));
    console.log(await db.hasAsync("id0001"));

    console.log("Get check 2A ".padEnd(50, "-"));
    console.log(db.get("id0000"));
    console.log("Get check 2B ".padEnd(50, "-"));
    console.log(await db.getAsync("id0001"));

    console.log("Clear check 1 ".padEnd(50, "-"));
    console.log(db.clear());
    console.log("Clear check 2 ".padEnd(50, "-"));
    await db.setAsync("id0000", data);
    console.log(await db.clearAsync());

    console.log("Query check 1 ".padEnd(50, "-"));
    console.log(db.query("SELECT * FROM test"));
    console.log("Query check 2 ".padEnd(50, "-"));
    console.log(await db.queryAsync("SELECT * FROM test"));

    console.log("ForEach check 1 ".padEnd(50, "-"));
    db.forEach((value, key) => {
        console.log(key, value);
    });

    console.log("ForEach check 2 ".padEnd(50, "-"));
    await db.forEachAsync((value, key) => {
        console.log(key, value);
    });

    console.log("Check is completed perfectly.");
})();

async function wait(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}