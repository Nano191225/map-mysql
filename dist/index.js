"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = __importDefault(require("mysql"));
class Database extends Map {
    static connection;
    static customPaths = [];
    static customPath = false;
    tableName;
    _values;
    ready = false;
    _path;
    _questionMarks;
    constructor(tableName) {
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
            if (error)
                throw error;
        });
        this._path = "`key`, " + (Database.customPath ? Database.customPaths.join(", ").replace(/\./g, "$") : "value");
        this._questionMarks = "?, " + (Database.customPath ? Database.customPaths.map(() => "?").join(", ") : "?");
        this.load();
    }
    load() {
        super.clear();
        const connection = Database.connection;
        connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
            if (error)
                throw error;
            if (Database.customPath) {
                results.forEach((result) => {
                    try {
                        const value = this.mergeValues(result);
                        super.set(result.key, JSON.stringify(value));
                    }
                    catch {
                        super.set(result.key, undefined);
                    }
                });
            }
            else {
                results.forEach((result) => {
                    console.log(result);
                    super.set(result.key, result.value);
                });
            }
        });
        this.ready = true;
    }
    async loadAsync() {
        return new Promise((resolve, reject) => {
            super.clear();
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error)
                    reject(error);
                if (Database.customPath) {
                    results.forEach((result) => {
                        const value = this.mergeValues(result);
                        super.set(result.key, JSON.stringify(value));
                    });
                }
                else {
                    results.forEach((result) => {
                        super.set(result.key, result.value);
                    });
                }
                this.ready = true;
                resolve();
            });
        });
    }
    set(key, value) {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        value = JSON.stringify(value);
        super.set(key, value);
        const connection = Database.connection;
        if (Database.customPath) {
            const newValue = this.extractValues(JSON.parse(value));
            const values = Object.values(newValue).map((v) => JSON.stringify(v));
            const query = `REPLACE INTO ${this.tableName} (${this._path}) VALUES (${this._questionMarks})`;
            connection.query(query, [key, ...values], (error, results, fields) => {
                if (error)
                    throw error;
            });
        }
        else {
            connection.query(`REPLACE INTO ${this.tableName} (\`key\`, value) VALUES (?, ?)`, [key, value], (error, results, fields) => {
                if (error)
                    throw error;
            });
        }
        return this;
    }
    async setAsync(key, value) {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            value = JSON.stringify(value);
            super.set(key, value);
            const connection = Database.connection;
            if (Database.customPath) {
                const newValue = this.extractValues(JSON.parse(value));
                const values = Object.values(newValue).map((v) => JSON.stringify(v));
                const query = `REPLACE INTO ${this.tableName} (${this._path}) VALUES (${this._questionMarks})`;
                connection.query(query, [key, ...values], (error, results, fields) => {
                    if (error)
                        reject(error);
                    resolve(this);
                });
            }
            else {
                connection.query(`REPLACE INTO ${this.tableName} (\`key\`, value) VALUES (?, ?)`, [key, value], (error, results, fields) => {
                    if (error)
                        reject(error);
                    resolve(this);
                });
            }
        });
    }
    delete(key) {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        super.delete(key);
        const connection = Database.connection;
        connection.query(`DELETE FROM ${this.tableName} WHERE \`key\` = ?`, [key], (error, results, fields) => {
            if (error)
                throw error;
        });
        return true;
    }
    async deleteAsync(key) {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            super.delete(key);
            const connection = Database.connection;
            connection.query(`DELETE FROM ${this.tableName} WHERE \`key\` = ?`, [key], (error, results, fields) => {
                if (error)
                    reject(error);
                resolve(true);
            });
        });
    }
    clear() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        super.clear();
        const connection = Database.connection;
        connection.query(`DELETE FROM ${this.tableName}`, (error, results, fields) => {
            if (error)
                throw error;
        });
    }
    async clearAsync() {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            super.clear();
            const connection = Database.connection;
            connection.query(`DELETE FROM ${this.tableName}`, (error, results, fields) => {
                if (error)
                    reject(error);
                resolve();
            });
        });
    }
    has(key) {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        return super.has(key);
    }
    async hasAsync(key) {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            const data1 = super.has(key);
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName} WHERE \`key\` = ?`, [key], (error, results, fields) => {
                if (error)
                    reject(error);
                const data2 = results.length > 0;
                if (data1 !== data2)
                    return reject(new Error("Database integrity error."));
                resolve(data1);
            });
        });
    }
    getRaw(key) {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        return super.get(key);
    }
    async getRawAsync(key) {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            const data1 = super.get(key);
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName} WHERE \`key\` = ?`, [key], (error, results, fields) => {
                if (error)
                    reject(error);
                const data2 = results[0];
                if (data1 !== data2)
                    return reject(new Error("Database integrity error."));
                resolve(data1);
            });
        });
    }
    get(key) {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        try {
            return JSON.parse(super.get(key));
        }
        catch (error) {
            return super.get(key);
        }
    }
    async getAsync(key) {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            const data1 = this.isSafeJson("parse", super.get(key)) ? JSON.parse(super.get(key)) : super.get(key);
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName} WHERE \`key\` = ?`, [key], (error, results, fields) => {
                if (error)
                    reject(error);
                if (Database.customPath) {
                    try {
                        const data2 = this.mergeValues(results[0]);
                        if (JSON.stringify(data1) !== JSON.stringify(data2))
                            return reject(new Error("Database integrity error."));
                    }
                    catch (error) {
                        if (results.length > 0)
                            return reject(new Error("Database integrity error."));
                        return resolve(undefined);
                    }
                }
                else {
                    const data2 = results[0].value;
                    if (JSON.stringify(data1) !== data2)
                        return reject(new Error("Database integrity error."));
                }
                resolve(data1);
            });
        });
    }
    keys() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return super.keys();
    }
    async keysAsync() {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            const data1 = [...super.keys()];
            const connection = Database.connection;
            connection.query(`SELECT \`key\` FROM ${this.tableName}`, (error, results, fields) => {
                if (error)
                    reject(error);
                const data2 = results.map((result) => result.key);
                if (JSON.stringify(data1) !== JSON.stringify(data2))
                    return reject(new Error("Database integrity error."));
                resolve(data1[Symbol.iterator]());
            });
        });
    }
    valuesRaw() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return super.values();
    }
    async valuesRawAsync() {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            const data1 = [...super.values()];
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error)
                    reject(error);
                if (Database.customPath) {
                    try {
                        const data2 = results.map((result) => JSON.stringify(this.mergeValues(result)));
                        console.log(data1, data2);
                        if (JSON.stringify(data1) !== JSON.stringify(data2))
                            return reject(new Error("Database integrity error."));
                    }
                    catch {
                        return reject(new Error("Database integrity error."));
                    }
                }
                else {
                    const data2 = results.map((result) => result.value);
                    if (JSON.stringify(data1) !== JSON.stringify(data2))
                        return reject(new Error("Database integrity error."));
                }
                resolve(data1[Symbol.iterator]());
            });
        });
    }
    values() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return this.parseArray(super.values());
    }
    async valuesAsync() {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            const data1 = [...super.values()];
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error)
                    reject(error);
                if (Database.customPath) {
                    const data2 = results.map((result) => JSON.stringify(this.mergeValues(result)));
                    if (JSON.stringify(data1) !== JSON.stringify(data2))
                        return reject(new Error("Database integrity error."));
                }
                else {
                    const data2 = results.map((result) => result.value);
                    if (JSON.stringify(data1) !== JSON.stringify(data2))
                        return reject(new Error("Database integrity error."));
                }
                resolve(this.parseArray(data1[Symbol.iterator]()));
            });
        });
    }
    entriesRaw() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return super.entries();
    }
    async entriesRawAsync() {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            const data1 = [...super.entries()];
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error)
                    reject(error);
                if (Database.customPath) {
                    try {
                        const data2 = results.map((result) => [result.key, JSON.stringify(this.mergeValues(result))]);
                        if (JSON.stringify(data1) !== JSON.stringify(data2))
                            return reject(new Error("Database integrity error."));
                    }
                    catch {
                        resolve(data1[Symbol.iterator]());
                    }
                }
                else {
                    const data2 = results.map((result) => [result.key, result.value]);
                    if (JSON.stringify(data1) !== JSON.stringify(data2))
                        return reject(new Error("Database integrity error."));
                }
                resolve(data1[Symbol.iterator]());
            });
        });
    }
    entries() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return this.parseEntries(super.entries());
    }
    async entriesAsync() {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            const data1 = [...super.entries()];
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error)
                    reject(error);
                if (Database.customPath) {
                    const data2 = results.map((result) => [result.key, JSON.stringify(this.mergeValues(result))]);
                    if (JSON.stringify(data1) !== JSON.stringify(data2))
                        return reject(new Error("Database integrity error."));
                }
                else {
                    const data2 = results.map((result) => [result.key, result.value]);
                    if (JSON.stringify(data1) !== JSON.stringify(data2))
                        return reject(new Error("Database integrity error."));
                }
                resolve(this.parseEntries(data1[Symbol.iterator]()));
            });
        });
    }
    forEachRaw(callbackfn, thisArg) {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        super.forEach(callbackfn, thisArg);
    }
    async forEachRawAsync(callbackfn, thisArg) {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            super.forEach(callbackfn, thisArg);
        });
    }
    forEach(callbackfn, thisArg) {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        super.forEach((value, key, map) => {
            callbackfn(JSON.parse(value), key, map);
        }, thisArg);
    }
    async forEachAsync(callbackfn, thisArg) {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            super.forEach((value, key, map) => {
                callbackfn(JSON.parse(value), key, map);
            }, thisArg);
            resolve();
        });
    }
    query(query) {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        const connection = Database.connection;
        return connection.query(query, (error, results, fields) => {
            if (error)
                throw error;
            return results;
        });
    }
    async queryAsync(query) {
        return new Promise(async (resolve, reject) => {
            if (!(await this.waitReady()))
                reject(new Error("Database is not ready yet."));
            const connection = Database.connection;
            connection.query(query, (error, results, fields) => {
                if (error)
                    reject(error);
                resolve(results);
            });
        });
    }
    extractValues(value) {
        const values = {};
        for (const path of Database.customPaths) {
            const keys = path.split(".");
            let temp = JSON.parse(JSON.stringify(value));
            for (const key of keys) {
                if (temp[key] !== undefined) {
                    temp = temp[key];
                }
                else {
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
    mergeValues(values) {
        const value = {};
        for (const [key, val] of Object.entries(values)) {
            if (key === "key")
                continue;
            const keys = key.split("$");
            if (keys.length === 1) {
                value[keys[0]] = JSON.parse(val);
            }
            else {
                let temp = value;
                for (let i = 0; i < keys.length; i++) {
                    if (i === keys.length - 1) {
                        temp[keys[i]] = JSON.parse(val);
                    }
                    else {
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
    isSafeJson(check, value) {
        try {
            if (check === "parse") {
                JSON.parse(value);
            }
            else {
                JSON.stringify(value);
            }
            return true;
        }
        catch (error) {
            return false;
        }
    }
    sanitize(key) {
        if (!key.length)
            throw new Error("Key must not be empty.");
        key = key.replace(/[^a-zA-Z0-9_]/g, (match) => {
            if (match === "'")
                return "''";
            if (match === "\\")
                return "\\\\";
            if (match === " ")
                return "_";
            return `${match.charCodeAt(0).toString(16)}`.padStart(5, "u0000");
        });
        if (key.length > 255)
            throw new Error("Key must not be longer than 255 characters.");
        return key;
    }
    waitReady() {
        const start = Date.now();
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (this.ready) {
                    clearInterval(interval);
                    resolve(this);
                }
                else if (Date.now() - start > 10000) {
                    clearInterval(interval);
                    reject(new Error("Database is not ready yet."));
                }
            }, 100);
        });
    }
    parseArray(array) {
        const parsed = [];
        for (const value of array) {
            if (typeof value === "string") {
                parsed.push(JSON.parse(value));
            }
            else {
                parsed.push(value);
            }
        }
        return parsed[Symbol.iterator]();
    }
    parseEntries(array) {
        const parsed = [];
        for (const [key, value] of array) {
            parsed.push([key, JSON.parse(value)]);
        }
        return parsed[Symbol.iterator]();
    }
    static connect(host, user, password, database, autoReconnect = 1000 * 60 * 60) {
        try {
            Database.connection = mysql_1.default.createConnection({
                host: host,
                user: user,
                password: password,
                database: database,
            });
        }
        catch (error) {
            if (error.code === "ER_NO_DB_ERROR") {
                Database.connection = mysql_1.default.createConnection({
                    host: host,
                    user: user,
                    password: password,
                });
                Database.connection.connect();
                Database.connection.query(`CREATE DATABASE IF NOT EXISTS ${database}`, (error, results, fields) => {
                    if (error)
                        throw error;
                });
                Database.connection.end();
                Database.connect(host, user, password, database);
            }
            else {
                throw error;
            }
            return;
        }
        Database.connection.connect();
        if (autoReconnect > 0)
            setInterval(() => {
                Database.reconnect();
            }, autoReconnect);
    }
    static disconnect() {
        Database.connection.end();
    }
    static reconnect() {
        const connection = Database.connection;
        connection.query("SELECT 1", (error, results, fields) => {
            connection.end();
            Database.connection = mysql_1.default.createConnection(connection.config);
            Database.connection.connect();
            Database.connection.query("SELECT 1", (error, results, fields) => {
                if (error)
                    throw error;
            });
        });
    }
    static isConnected() {
        return Database.connection.state === "authenticated" || Database.connection.state === "connected";
    }
    static setJsonPath(path) {
        Database.customPaths.push(path);
        Database.customPath = true;
    }
}
exports.default = Database;
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
        }
        else {
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
async function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
