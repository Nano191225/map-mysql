"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = __importDefault(require("mysql"));
class Database extends Map {
    static connection;
    tableName;
    ready = false;
    constructor(tableName) {
        super();
        this.tableName = tableName;
        const connection = Database.connection;
        connection.query(`CREATE TABLE IF NOT EXISTS ${this.tableName} (\`key\` VARCHAR(128) PRIMARY KEY, value TEXT)`, (error, results, fields) => {
            if (error)
                throw error;
        });
        this.load();
        this.ready = true;
    }
    load() {
        super.clear();
        const connection = Database.connection;
        connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
            if (error)
                throw error;
            results.forEach((result) => {
                super.set(result.key, result.value);
            });
        });
    }
    async loadAsync() {
        return new Promise((resolve, reject) => {
            super.clear();
            const connection = Database.connection;
            connection.query(`SELECT * FROM ${this.tableName}`, (error, results, fields) => {
                if (error)
                    reject(error);
                results.forEach((result) => {
                    super.set(result.key, result.value);
                });
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
        connection.query(`REPLACE INTO ${this.tableName} (\`key\`, value) VALUES (?, ?)`, [key, value], (error, results, fields) => {
            if (error)
                throw error;
        });
        return this;
    }
    async setAsync(key, value) {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            value = JSON.stringify(value);
            super.set(key, value);
            const connection = Database.connection;
            connection.query(`REPLACE INTO ${this.tableName} (\`key\`, value) VALUES (?, ?)`, [key, value], (error, results, fields) => {
                if (error)
                    reject(error);
                resolve(this);
            });
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
            if (!await this.waitReady())
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
            if (!await this.waitReady())
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
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            resolve(super.has(key));
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
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            resolve(super.get(key));
        });
    }
    get(key) {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        key = this.sanitize(key);
        return JSON.parse(super.get(key));
    }
    async getAsync(key) {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            key = this.sanitize(key);
            resolve(JSON.parse(super.get(key)));
        });
    }
    keysRaw() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return super.keys();
    }
    async keysRawAsync() {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            resolve(super.keys());
        });
    }
    keys() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return this.parseArray(super.keys());
    }
    async keysAsync() {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            resolve(this.parseArray(super.keys()));
        });
    }
    valuesRaw() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return super.values();
    }
    async valuesRawAsync() {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            resolve(super.values());
        });
    }
    values() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return this.parseArray(super.values());
    }
    async valuesAsync() {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            resolve(this.parseArray(super.values()));
        });
    }
    entriesRaw() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return super.entries();
    }
    async entriesRawAsync() {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            resolve(super.entries());
        });
    }
    entries() {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        return this.parseEntries(super.entries());
    }
    async entriesAsync() {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            resolve(this.parseEntries(super.entries()));
        });
    }
    forEachRaw(callbackfn, thisArg) {
        if (!this.ready)
            throw new Error("Database is not ready yet.");
        super.forEach(callbackfn, thisArg);
    }
    async forEachRawAsync(callbackfn, thisArg) {
        return new Promise(async (resolve, reject) => {
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            super.forEach(callbackfn, thisArg);
            resolve();
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
            if (!await this.waitReady())
                reject(new Error("Database is not ready yet."));
            super.forEach((value, key, map) => {
                callbackfn(JSON.parse(value), key, map);
            }, thisArg);
            resolve();
        });
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
                parsed.push(JSON.stringify(value));
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
    static connect(host, user, password, database) {
        try {
            Database.connection = mysql_1.default.createConnection({
                host: host,
                user: user,
                password: password,
                database: database
            });
        }
        catch (error) {
            if (error.code === "ER_NO_DB_ERROR") {
                Database.connection = mysql_1.default.createConnection({
                    host: host,
                    user: user,
                    password: password
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
        setInterval(() => {
            Database.reconnect();
        }, 1000 * 60 * 60); // 1 hour
    }
    static disconnect() {
        Database.connection.end();
    }
    static reconnect() {
        Database.connection.end();
        Database.connection.connect();
    }
    static isConnected() {
        return Database.connection.state === "authenticated" || Database.connection.state === "connected";
    }
}
exports.default = Database;
(async () => {
    /* Example usage */
    Database.connect("localhost", "root", "passw", "test");
    const db = new Database("test");
    (await db.waitReady()).set("key", "value");
    console.log(db.get("key"));
    db.delete("key");
})();
