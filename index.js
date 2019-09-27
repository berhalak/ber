const { readdirSync, statSync, readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } = require('fs')
const { join, resolve, relative, basename } = require('path')

const { exec, execSync } = require('child_process');

class Context {
    constructor(current) {
        this.current = current;
    }

    getFileName(path) {
        return basename(path);
    }

    installModule(file) {
        execSync(`npm i ${file}`);
    }

    packPackage(/** @type { string} */ folder, info) {
        let abs = resolve(folder);
        execSync(`npm pack ${abs}`);
        let name = info.name;
        name = name.replace("/", "-").replace("@", "");
        name = `${name}-${info.version}.tgz`;

        let oldPath = name;
        let newPath = join("local_modules", name);

        if (!existsSync("local_modules")) {
            mkdirSync("local_modules");
        }

        let counter = 5;
        while (!existsSync(oldPath) && counter--) {
            var waitTill = new Date(new Date().getTime() + 1 * 1000);
            while (waitTill > new Date()) { }
        }

        renameSync(oldPath, newPath);

        return newPath;
    }

    readPackageInfo(/** @type { string} */ folder) {
        let fileName = join(folder, "package.json");
        let content = JSON.parse(readFileSync(fileName).toString());
        return content;
    }

    addPackageAsBerToLocalPJ(/** @type { string} */ folder, /** @type { string} */ packageName) {
        let local_package_json = join(this.current, "package.json");
        let content = JSON.parse(readFileSync(local_package_json).toString());
        if (!content.ber) {
            content.ber = {};
        }
        folder = relative(this.current, folder);
        content.ber[packageName] = folder;
        writeFileSync(local_package_json, JSON.stringify(content, null, 2));
    }

    buildPackage(/** @type { string} */ folder) {
        let abs = resolve(folder);
        execSync(`npm run --prefix ${abs} build`);
    }

    installFromFolder(/** @type { string} */ folder, build) {

        let info = this.readPackageInfo(folder);
        this.addPackageAsBerToLocalPJ(folder, info.name);
        if (build) {
            this.buildPackage(folder);
        }
        let tarFile = this.packPackage(folder, info);
        this.installModule(tarFile);
    }

    update() {
        let info = this.readPackageInfo(this.current);
        if (info.ber) {
            for (let key in info.ber) {
                let value = info.ber[key];
                console.log("package " + key);
                this.installFromFolder(value);
            }
        }
    }

    build() {
        let info = this.readPackageInfo(this.current);
        if (info.ber) {
            for (let key in info.ber) {
                let value = info.ber[key];
                console.log("package " + key);
                this.installFromFolder(value, true);
            }
        }
    }
}



exports.main = function (/** @type { Array} */ args) {
    // install local folder to package json
    if (args.length == 2 && args[0] == "i") {
        let context = new Context(process.cwd());
        console.log("Instaling package... " + args[1])
        context.installFromFolder(args[1]);
    } else if (args.length == 1 && args[0] == "i") {
        let context = new Context(process.cwd());
        console.log("Restoring packages... ");
        context.update();
    } else if (args.length == 1 && args[0] == "b") {
        let context = new Context(process.cwd());
        console.log("Building local packages... ");
        context.build();
    } else {
        console.log("usage: ber i [<path_to_package>]");
    }
}