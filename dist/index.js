"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const rimraf_1 = __importDefault(require("rimraf"));
async function readJson(file) {
    let content = JSON.parse((await fs_extra_1.default.readFile(file)).toString());
    return content;
}
async function writeJson(file, data) {
    await fs_extra_1.default.writeFile(file, JSON.stringify(data, null, 2));
}
async function readConfig(path) {
    let file = path_1.default.resolve(path_1.default.join(path, "package.json"));
    return await readJson(file);
}
async function writeConfig(path, data) {
    let file = path_1.default.resolve(path_1.default.join(path, "package.json"));
    await writeJson(file, data);
}
class Directory {
    static remove(path) {
        return new Promise((resolve, reject) => {
            rimraf_1.default(path, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
function run(command, cwd) {
    if (cwd) {
        console.log(`[${cwd}] ${command}`);
    }
    else {
        console.log(command);
    }
    return new Promise(function (resolve, reject) {
        child_process_1.exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
class Npm {
    static async install(file, cwd) {
        file = path_1.default.relative(cwd, file);
        file = file.split("\\").join("/");
        await run(`yarn add file:${file}`, cwd);
    }
}
class Tgz {
    constructor(name, version, folder) {
        this.name = name;
        this.version = version;
        this.folder = folder;
        this.fileName = name.replace("@", "").replace("/", "-") + "-" + version + ".tgz";
    }
    path() {
        return path_1.default.resolve(this.folder, this.fileName);
    }
    async copyTo(folder) {
        let newPath = path_1.default.resolve(path_1.default.join(folder, this.fileName));
        console.log(`copy ${this.path()} -> ${newPath}`);
        await fs_extra_1.default.copyFile(this.path(), newPath);
        return new Tgz(this.name, this.version, folder);
    }
    async exists() {
        return await fs_extra_1.default.pathExists(this.path());
    }
}
const local_modules = "local_modules";
const dotOutput = ".out";
class Package {
    constructor(path) {
        this.info = null;
        this.path = path_1.default.resolve(path);
    }
    async install(pkg) {
        if (pkg) {
            await pkg.clean();
            await this.addToBer(pkg);
            await this.installPackage(pkg);
        }
        else {
            let references = await this.references();
            for (let ref of references) {
                await ref.clean();
            }
            for (let ref of references) {
                await this.installPackage(ref);
            }
        }
    }
    async references() {
        let myConfig = await readConfig(this.path);
        let result = [];
        for (let name in myConfig.ber) {
            let path = myConfig.ber[name];
            path = path_1.default.resolve(path_1.default.join(this.path, path));
            result.push(new Package(path));
        }
        return result;
    }
    async installPackage(pkg) {
        for (let ref of await pkg.references()) {
            await this.installPackage(ref);
        }
        let pkgOutput = await pkg.output();
        let myBinary = await pkgOutput.copyTo(await this.localRepo());
        await Npm.install(myBinary.path(), this.path);
    }
    async localRepo() {
        let path = path_1.default.resolve(path_1.default.join(this.path, local_modules));
        if (!await fs_extra_1.default.pathExists(path)) {
            await fs_extra_1.default.mkdir(path);
        }
        return path;
    }
    async output() {
        let name = await this.name();
        let version = await this.version();
        let outPath = path_1.default.resolve(path_1.default.join(this.path, dotOutput));
        let tgz = new Tgz(name, version, outPath);
        if (await tgz.exists()) {
            return tgz;
        }
        await this.build();
        return tgz;
    }
    async build() {
        console.log("Building package " + await this.name());
        let references = await this.references();
        for (let ref of references) {
            let pkgOutput = await ref.output();
            let myBinary = await pkgOutput.copyTo(await this.localRepo());
            await Npm.install(myBinary.path(), this.path);
        }
        if (!this.info) {
            await this.readInfo();
        }
        if (this.info.scripts['build']) {
            await run('npm run build', this.path);
        }
        let outputPath = path_1.default.resolve(this.path, dotOutput);
        if (!await fs_extra_1.default.pathExists(outputPath)) {
            await fs_extra_1.default.mkdir(outputPath);
        }
        await run("npm pack ../", outputPath);
        console.log("Build finish " + await this.name());
    }
    async clean() {
        let outDir = path_1.default.resolve(path_1.default.join(this.path, dotOutput));
        await Directory.remove(outDir);
        let references = await this.references();
        for (let ref of references) {
            await ref.clean();
        }
    }
    async addToBer(pkg) {
        let config = await readConfig(this.path);
        let packagePath = pkg.path;
        let packageName = await pkg.name();
        config.ber = config.ber || {};
        config.ber[packageName] = path_1.default.relative(this.path, packagePath);
        await writeConfig(this.path, config);
    }
    async name() {
        if (!this.info) {
            await this.readInfo();
        }
        return this.info.name;
    }
    async version() {
        if (!this.info) {
            await this.readInfo();
        }
        return this.info.version;
    }
    async readInfo() {
        if (!this.info) {
            this.info = await readConfig(this.path);
        }
    }
}
exports.main = async function (/** @type { Array} */ args) {
    // install local folder to package json
    if (args.length == 2 && args[0] == "i") {
        let self = new Package(process.cwd());
        let ref = args[1];
        console.log("Installing package... " + args[1]);
        await self.install(new Package(ref));
    }
    else if (args.length == 1 && args[0] == "i") {
        let self = new Package(process.cwd());
        console.log("Restoring packages... ");
        await self.install();
    }
    else {
        console.log("usage: ber i [<path_to_package>]");
    }
};
