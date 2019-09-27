const { readdirSync, statSync, readFileSync, writeFileSync, renameSync } = require('fs')
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
        exec(`npm i ${file}`);
    }

    packPackage(/** @type { string} */ folder, info) {
        let abs = resolve(folder);
        exec(`npm pack ${abs}`);
        let name = info.name;
        name = name.replace("/", "_").replace("@", "");
        name = `${name}_${info.version}.tgs`;

        let oldPath = name;
        let newPath = join("local_modules", name);

        renameSync(oldPath, newPath);

        return newPath;
    }

    readPackageName(/** @type { string} */ folder) {
        let fileName = join(folder, "package.json");
        let content = readFileSync(fileName).toString();
        return content;
    }

    addPackageAsBerToLocalPJ(/** @type { string} */ folder, /** @type { string} */ packageName) {
        let local_package_json = join(this.current, "package.json");
        let content = readFileSync(local_package_json).toString();
        if (!content.ber) {
            content.ber = {};
        }
        content.ber[packageName] = folder;
        writeFileSync(local_package_json, JSON.stringify(content, null, 2));
    }

    installFromFolder(folder) {
        let info = this.readPackageInfo(folder);
        this.addPackageAsBerToLocalPJ(folder, info.name);
        let tarFile = this.packPackage(folder, info);
        this.moveFile(tarFile, "./local_modules");
        let name = this.getFileName(tarFile);
        this.installModule('./local_modules/' + name);
    }
}



exports.main = function (/** @type { Array} */ args) {
    // install local folder to package json
    if (args.length == 2 && args[0] == "i") {
        let context = new Context(process.cwd());
        context.installFromFolder(args[1]);
    }
}