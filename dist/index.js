"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
function run(command) {
    return new Promise(function (resolve, reject) {
        child_process_1.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
class Context {
    constructor(current) {
        this.current = current;
        this.infos = {};
        this.current = current;
    }
    getFileName(path) {
        return path_1.default.basename(path);
    }
    async installTar(file) {
        console.log("instaling " + file.name);
        await run(`npm i ${file.path}`);
    }
    async packPackage(folder) {
        let info = await this.readPackageInfo(folder);
        let abs = path_1.default.resolve(folder);
        await run(`npm pack ${abs}`);
        let name = info.name;
        name = name.replace("/", "-").replace("@", "");
        name = `${name}-${info.version}.tgz`;
        let oldPath = name;
        let newPath = path_1.default.join("local_modules", name);
        if (!await fs_extra_1.default.pathExists("local_modules")) {
            await fs_extra_1.default.mkdir("local_modules");
        }
        await fs_extra_1.default.rename(oldPath, newPath);
        return {
            name: info.name,
            path: newPath
        };
    }
    async readPackageInfo(folder) {
        if (this.infos[folder]) {
            return this.infos[folder];
        }
        let fileName = path_1.default.join(folder, "package.json");
        let content = JSON.parse((await fs_extra_1.default.readFile(fileName)).toString());
        this.infos[folder] = content;
        return content;
    }
    async declarePackage(folder) {
        let info = await this.readPackageInfo(folder);
        let local_package_json = path_1.default.join(this.current, "package.json");
        let content = JSON.parse((await fs_extra_1.default.readFile(local_package_json)).toString());
        if (!content.ber) {
            content.ber = {};
        }
        folder = path_1.default.relative(this.current, folder);
        content.ber[info.name] = folder;
        await fs_extra_1.default.writeFile(local_package_json, JSON.stringify(content, null, 2));
    }
    async buildPackage(folder) {
        let info = await this.readPackageInfo(folder);
        if (info.scripts && info.scripts.build) {
            console.log("building package " + info.name);
            let abs = path_1.default.resolve(folder);
            let cmd = `npm run --prefix ${abs} build`;
            try {
                await run(cmd);
            }
            catch (e) {
                console.error("Error building " + info.name + " " + e.message);
                console.error(cmd);
                process.exit(-1);
            }
        }
    }
    async installFromFolder(folder) {
        await this.declarePackage(folder);
        let dll = await this.packPackage(folder);
        await this.installTar(dll);
    }
    async update() {
        let info = await this.readPackageInfo(this.current);
        if (info.ber) {
            for (let key in info.ber) {
                let value = info.ber[key];
                console.log("package " + key);
                await this.installFromFolder(value);
            }
        }
    }
    async buildAndPackPackage(folder) {
        await this.buildPackage(folder);
        return await this.packPackage(folder);
    }
    async buildDeps() {
        let pj = await this.readPackageInfo(this.current);
        if (pj.ber) {
            for (let key in pj.ber) {
                let folder = pj.ber[key];
                let info = await this.buildAndPackPackage(folder);
                await this.installTar(info);
            }
        }
    }
}
exports.main = async function (/** @type { Array} */ args) {
    // install local folder to package json
    if (args.length == 2 && args[0] == "i") {
        let context = new Context(process.cwd());
        console.log("Instaling package... " + args[1]);
        await context.installFromFolder(args[1]);
    }
    else if (args.length == 1 && args[0] == "i") {
        let context = new Context(process.cwd());
        console.log("Restoring packages... ");
        await context.update();
    }
    else if (args.length == 1 && args[0] == "b") {
        let context = new Context(process.cwd());
        console.log("Building local packages... ");
        await context.buildDeps();
    }
    else {
        console.log("usage: ber i [<path_to_package>]");
    }
};
