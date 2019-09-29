# ber

npm i -g ber

# Description

This tool allows to install package as local dependency using tarbal (npm pack).

Usage

ber i path_to_package

ber i // updates all local packages

Packages are stored as tgz files in folder ./local_modules

Primary it is used to deploy functions to firebase with local packages

Go to example directory (example) and run:

cd ./libs/lib_a
ber i ../libs/lib_b // install lib_b in lib_a
cd ../../web // go to web
ber i ../libs/lib_a
ber i ../libs/lib_b

Example directory has dependency tree:

- web (depends on lib_a, and lib_b)
- lib_a (depends on lib_b)

No whenever something changes, just hit in web directory
ber i 
And everything will be reinstalled

ber, will first build package lib_b (execute build script if any, and pack the package), then build package lib_a, and then install them both in web using npm install ./.local_modules/*.tgz
