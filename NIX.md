# Lumo on Nix

The `flake.nix` exposes three things:

- `packages.lumo` (also `packages.default`) — the installable app
- `overlays.default` — an overlay for nixpkgs
- `devShells.default` — a shell for hacking on Lumo

## Install into your system config (Flakes)

Add the input:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    lumo.url = "github:rootscripts/riff";
  };

  outputs = { self, nixpkgs, lumo, ... }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ({ pkgs, ... }: {
          environment.systemPackages = [ lumo.packages.x86_64-linux.default ];
        })
      ];
    };
  };
}
```

For home-manager, inside your home config:

```nix
{
  inputs.lumo.url = "github:rootscripts/riff";

  outputs = { nixpkgs, home-manager, lumo, ... }: {
    homeConfigurations.you = home-manager.lib.homeManagerConfiguration {
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
      modules = [
        ({ pkgs, ... }: {
          home.packages = [ lumo.packages.x86_64-linux.default ];
        })
      ];
    };
  };
}
```

## Install via an overlay

Useful when you want `pkgs.lumo` available everywhere rather than referencing `lumo.packages...` directly:

```nix
{
  inputs.lumo.url = "github:rootscripts/riff";

  outputs = { nixpkgs, lumo, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs {
        inherit system;
        overlays = [ lumo.overlays.default ];
      };
    in {
      nixosConfigurations.myhost = pkgs.lib.nixosSystem {
        inherit system;
        modules = [{ environment.systemPackages = [ pkgs.lumo ]; }];
      };
    };
}
```

## One-off / user installs (no config change)

```bash
# install into your profile
nix profile install github:rootscripts/riff

# or just run it once
nix run github:rootscripts/riff

# from a local checkout
nix profile install .
nix run .
```

After installing, `lumo` is on your `PATH` and a `Lumo` desktop entry + icon are registered.

## Development shell

```bash
git clone https://github.com/rootscripts/riff
cd riff
nix develop          # nodejs, python3, yt-dlp, ffmpeg
npm install
npm start
```

## Notes

- The package wraps the nixpkgs `electron` with the app directory and puts `yt-dlp` and `ffmpeg` on `PATH`, so Lumo finds them instead of self-downloading.
- `npmDepsHash` in `flake.nix` must be updated whenever `package.json`/`package-lock.json` change. Rebuild with a wrong/placeholder hash and copy the reported `got:` value, or regenerate it with `nix-prefetch-npm-deps` / `prefetch-npm-deps`.
