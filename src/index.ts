import File from "fs-extra"
import Path from "path"
import { exec } from 'child_process';
import rimraf from "rimraf";

async function readJson(file: string): Promise<any> {
    let content = JSON.parse((await File.readFile(file)).toString());
    return content;
}

async function writeJson(file: string, data: any): Promise<void> {
    await File.writeFile(file, JSON.stringify(data, null, 2));
}

async function readConfig(path: string): Promise<PackageJson> {
    let file = Path.resolve(Path.join(path, "package.json"));
    return await readJson(file);
}

async function writeConfig(path: string, data: PackageJson): Promise<void> {
    let file = Path.resolve(Path.join(path, "package.json"));
    await writeJson(file, data);
}



class Directory {
    public static remove(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            rimraf(path, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        })
    }
}

function run(command: string, cwd?: string) {
    if (cwd) {
        console.log(`[${cwd}] ${command}`);
    } else {
        console.log(command);
    }
    return new Promise(function (resolve, reject) {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(stdout.trim());
        });
    });
}

type PackageJson = { scripts: any, ber: any, name: string, version: string }

class Npm {
    static async install(file: any, cwd: string) {
        file = Path.relative(cwd, file);
        await run(`npm install ${file}`, cwd);
    }

}

class Tgz {
    fileName: string;
    constructor(public name: string, public version: string, public folder: string) {
        this.fileName = name.replace("@", "").replace("/", "-") + "-" + version + ".tgz";
    }
    path(): any {
        return Path.resolve(this.folder, this.fileName);
    }

    async copyTo(folder: string): Promise<Tgz> {
        let newPath = Path.resolve(Path.join(folder, this.fileName));
        console.log(`copy ${this.path()} -> ${newPath}`);
        await File.copyFile(this.path(), newPath);
        return new Tgz(this.name, this.version, folder);

    }

    async exists() {
        return await File.pathExists(this.path());
    }
}

const local_modules = ".local_modules";
const dotOutput = ".out";

class Package {
    public path: string;
    constructor(path: string) {
        this.path = Path.resolve(path);
    }

    public async install(): Promise<void>;
    public async install(pkg: Package): Promise<void>
    public async install(pkg?: Package) {
        if (pkg) {
            await pkg.clean();
            await this.addToBer(pkg);
            await this.installPackage(pkg);
        } else {
            let references: Package[] = await this.references();
            for (let ref of references) {
                await ref.clean();
            }
            for (let ref of references) {
                await this.installPackage(ref);
            }
        }
    }

    private async references(): Promise<Package[]> {
        let myConfig = await readConfig(this.path);
        let result: Package[] = [];
        for (let name in myConfig.ber) {
            let path = myConfig.ber[name];
            path = Path.resolve(Path.join(this.path, path));
            result.push(new Package(path));
        }
        return result;
    }


    private async installPackage(pkg: Package) {
        for (let ref of await pkg.references()) {
            await this.installPackage(ref);
        }
        let pkgOutput = await pkg.output();
        let myBinary = await pkgOutput.copyTo(await this.localRepo());
        await Npm.install(myBinary.path(), this.path);
    }

    private async localRepo() {
        let path = Path.resolve(Path.join(this.path, local_modules));
        if (!await File.pathExists(path)) {
            await File.mkdir(path);
        }
        return path;
    }

    private async output(): Promise<Tgz> {
        let name = await this.name();
        let version = await this.version();
        let outPath = Path.resolve(Path.join(this.path, dotOutput));
        let tgz = new Tgz(name, version, outPath);

        if (await tgz.exists()) {
            return tgz;
        }
        await this.build();
        return tgz;
    }

    private async build() {
        console.log("Building package " + await this.name());
        let references: Package[] = await this.references();

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

        let outputPath = Path.resolve(this.path, dotOutput);
        if (!await File.pathExists(outputPath)) {
            await File.mkdir(outputPath);
        }

        await run("npm pack ../", outputPath);
        console.log("Build finish " + await this.name());
    }

    private async clean(): Promise<void> {
        let outDir = Path.resolve(Path.join(this.path, dotOutput));
        await Directory.remove(outDir);
        let references: Package[] = await this.references();
        for (let ref of references) {
            await ref.clean();
        }
    }

    private async addToBer(pkg: Package) {
        let config = await readConfig(this.path);

        let packagePath = pkg.path;
        let packageName = await pkg.name();
        config.ber = config.ber || {};
        config.ber[packageName] = Path.relative(this.path, packagePath);
        await writeConfig(this.path, config);
    }

    private info: PackageJson = null;

    public async name() {
        if (!this.info) {
            await this.readInfo();
        }
        return this.info.name;
    }

    public async version() {
        if (!this.info) {
            await this.readInfo();
        }
        return this.info.version;
    }

    private async readInfo() {
        if (!this.info) {
            this.info = await readConfig(this.path);
        }
    }
}



exports.main = async function (/** @type { Array} */ args: any[]) {
    // install local folder to package json
    if (args.length == 2 && args[0] == "i") {
        let self = new Package(process.cwd());
        let ref = args[1] as string;
        console.log("Instaling package... " + args[1])
        await self.install(new Package(ref));
    } else if (args.length == 1 && args[0] == "i") {
        let self = new Package(process.cwd());
        console.log("Restoring packages... ");
        await self.install();
    } else {
        console.log("usage: ber i [<path_to_package>]");
    }
}