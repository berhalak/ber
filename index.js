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
        exec(`npm i ${file}`);
    }

    packPackage(/** @type { string} */ folder, info) {
        let abs = resolve(folder);
        exec(`npm pack ${abs}`);
        let name = info.name;
        name = name.replace("/", "_").replace("@", "");
        name = `${name}-${info.version}.tgz`;

        let oldPath = name;
        let newPath = join("local_modules", name);

        if (!existsSync("local_modules")) {
            mkdirSync("local_modules");
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

    installFromFolder(/** @type { string} */ folder) {

        let info = this.readPackageInfo(folder);
        this.addPackageAsBerToLocalPJ(folder, info.name);
        let tarFile = this.packPackage(folder, info);
        this.installModule(tarFile);
    }
}



exports.main = function (/** @type { Array} */ args) {
    // install local folder to package json
    if (args.length == 2 && args[0] == "i") {
        let context = new Context(process.cwd());
        console.log("Instaling package... " + args[1])
        context.installFromFolder(args[1]);
    } else {
        console.log("usage: ber i <path_to_package>");
    }
}