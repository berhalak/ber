# ber

npm i -g ber

# Description

This tool allows to install package as local dependency using tarbal (npm pack).

Usage

ber i <path_to_package>

ber i // updates all local packages

ber b // builds and install all dependencies

Packages are stored as tgz files in folder ./local_modules

Primary it is used to deploy functions to firebase with local packages
