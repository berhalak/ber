
const fs = require('promise-fs')
const { exists } = require("fs");
const { join, resolve, relative, basename } = require('path')

fs.exists = function (path) {
    return new Promise((resolve) => {
        exists(path, (is) => {
            resolve(is);
        })
    })
}

const { exec, execSync, spawnSync } = require('child_process');

function run(command) {
    return new Promise(function (resolve, reject) {
        exec(command, (error, stdout, stderr) => {
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
    }

    getFileName(path) {
        return basename(path);
    }

    async installTar(file) {
        console.log("instaling " + file.name);
        await run(`npm i ${file.path}`);
    }

    async packPackage(/** @type { string} */ folder) {
        let info = await this.readPackageInfo(folder);

        let abs = resolve(folder);
        await run(`npm pack ${abs}`);
        let name = info.name;
        name = name.replace("/", "-").replace("@", "");
        name = `${name}-${info.version}.tgz`;

        let oldPath = name;
        let newPath = join("local_modules", name);

        if (!await fs.exists("local_modules")) {
            await fs.mkdir("local_modules");
        }


        await fs.rename(oldPath, newPath);

        return {
            name: info.name,
            path: newPath
        };
    }



    async readPackageInfo(/** @type { string} */ folder) {
        if (this.infos[folder]) {
            return this.infos[folder];
        }
        let fileName = join(folder, "package.json");
        let content = JSON.parse((await fs.readFile(fileName)).toString());
        this.infos[folder] = content;
        return content;
    }

    async declarePackage(/** @type { string} */ folder) {
        let info = await this.readPackageInfo(folder);
        let local_package_json = join(this.current, "package.json");
        let content = JSON.parse((await fs.readFile(local_package_json)).toString());
        if (!content.ber) {
            content.ber = {};
        }
        folder = relative(this.current, folder);
        content.ber[info.name] = folder;
        await fs.writeFile(local_package_json, JSON.stringify(content, null, 2));
    }

    async buildPackage(/** @type { string} */ folder) {
        let info = await this.readPackageInfo(folder);
        if (info.scripts && info.scripts.build) {
            console.log("building package " + info.name);
            let abs = resolve(folder);
            let cmd = `npm run --prefix ${abs} build`;
            try {
                await run(cmd);
            } catch (e) {
                console.error("Error building " + info.name + " " + e.message);
                console.error(cmd);
                process.exit(-1);
            }
        }
    }

    async installFromFolder(/** @type { string} */ folder) {
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

    async buildAndUpdate(folder) {
        await this.buildPackage(folder);
        return await this.packPackage(folder);
    }

    async buildDeps() {
        let info = await this.readPackageInfo(this.current);
        if (info.ber) {
            let builds = [];
            for (let key in info.ber) {
                let folder = info.ber[key];
                builds.push(this.buildAndUpdate(folder));
            }
            let tars = await Promise.all(builds);
            for (let tar of tars) {
                await this.installTar(tar);
            }
        }
    }
}



exports.main = async function (/** @type { Array} */ args) {
    // install local folder to package json
    if (args.length == 2 && args[0] == "i") {
        let context = new Context(process.cwd());
        console.log("Instaling package... " + args[1])
        await context.installFromFolder(args[1]);
    } else if (args.length == 1 && args[0] == "i") {
        let context = new Context(process.cwd());
        console.log("Restoring packages... ");
        await context.update();
    } else if (args.length == 1 && args[0] == "b") {
        let context = new Context(process.cwd());
        console.log("Building local packages... ");
        await context.buildDeps();
    } else {
        console.log("usage: ber i [<path_to_package>]");
    }
}