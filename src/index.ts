
import File from "fs-extra"
import Path from "path"
import { exec, execSync, spawnSync } from 'child_process';

function run(command: string) {
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

type FileInfo = { name: string, path: string };

type PackageJson = { scripts: any, ber: any, name: string, version: string }

class Context {
    infos: any = {};
    constructor(private current: string) {
        this.current = current;
    }

    getFileName(path: string) {
        return Path.basename(path);
    }

    async installTar(file: FileInfo) {
        console.log("instaling " + file.name);
        await run(`npm i ${file.path}`);
    }

    async packPackage(folder: string): Promise<FileInfo> {
        let info = await this.readPackageInfo(folder);

        let abs = Path.resolve(folder);
        await run(`npm pack ${abs}`);
        let name = info.name;
        name = name.replace("/", "-").replace("@", "");
        name = `${name}-${info.version}.tgz`;

        let oldPath = name;
        let newPath = Path.join("local_modules", name);

        if (!await File.pathExists("local_modules")) {
            await File.mkdir("local_modules");
        }


        await File.rename(oldPath, newPath);

        return {
            name: info.name,
            path: newPath
        };
    }



    async readPackageInfo(folder: string): Promise<PackageJson> {
        if (this.infos[folder]) {
            return this.infos[folder];
        }
        let fileName = Path.join(folder, "package.json");
        let content = JSON.parse((await File.readFile(fileName)).toString());
        this.infos[folder] = content;
        return content;
    }

    async declarePackage(folder: string) {
        let info = await this.readPackageInfo(folder);
        let local_package_json = Path.join(this.current, "package.json");
        let content = JSON.parse((await File.readFile(local_package_json)).toString());
        if (!content.ber) {
            content.ber = {};
        }
        folder = Path.relative(this.current, folder);
        content.ber[info.name] = folder;
        await File.writeFile(local_package_json, JSON.stringify(content, null, 2));
    }

    async buildPackage(folder: string) {
        let info = await this.readPackageInfo(folder);
        if (info.scripts && info.scripts.build) {
            console.log("building package " + info.name);
            let abs = Path.resolve(folder);
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

    async installFromFolder(folder: string) {
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

    async buildAndPackPackage(folder: string) {
        await this.buildPackage(folder);
        return await this.packPackage(folder);
    }

    async buildDeps() {
        let pj = await this.readPackageInfo(this.current);
        if (pj.ber) {
            for (let key in pj.ber) {
                let folder: string = pj.ber[key];
                let info = await this.buildAndPackPackage(folder);
                await this.installTar(info);
            }
        }
    }
}



exports.main = async function (/** @type { Array} */ args: any[]) {
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