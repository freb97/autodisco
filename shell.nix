{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
    buildInputs = [
        pkgs.nodejs
        pkgs.bun
        pkgs.git
    ];
}
