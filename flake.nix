{
  description = "Lumo - a desktop audio player (Electron)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    let
      mkLumo = pkgs:
        pkgs.buildNpmPackage rec {
          pname = "lumo";
          version = "44.0.10";
          src = self;

          npmDepsHash = "sha256-PxmJzPE2RM+ZPpwdAiKy9PDEZpKb+Sgu8SERKv/VCW0=";

          ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
          forceGitDeps = true;
          npmInstallFlags = [ "--omit=dev" ];

          buildPhase = "true";

          installPhase =
            let
              appDir = "$out/share/lumo";
              runtimeDeps = pkgs.lib.makeBinPath [ pkgs.yt-dlp pkgs.ffmpeg ];
              desktop = pkgs.makeDesktopItem {
                name = "Lumo";
                desktopName = "Lumo";
                genericName = "Audio Player";
                exec = "lumo";
                icon = "lumo";
                categories = [ "AudioVideo" "Audio" "Player" ];
                startupWMClass = "lumo";
              };
            in
            ''
              runHook preInstall

              mkdir -p ${appDir}
              for f in *; do cp -r "$f" ${appDir}/; done

              mkdir -p $out/bin
              makeWrapper ${pkgs.electron}/bin/electron $out/bin/lumo \
                --add-flags ${appDir} \
                --prefix PATH : ${runtimeDeps}

              mkdir -p $out/share/applications
              cp ${desktop}/share/applications/*.desktop $out/share/applications/

              mkdir -p $out/share/icons/hicolor/256x256/apps
              cp ${appDir}/assets/lumo-icon.png $out/share/icons/hicolor/256x256/apps/lumo.png

              runHook postInstall
            '';

          meta = with pkgs.lib; {
            description = "Lumo - audio player made for humans";
            homepage = "https://github.com/rootscripts/riff";
            license = licenses.mit;
            mainProgram = "lumo";
            platforms = platforms.linux ++ platforms.darwin;
          };
        };
    in
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        packages = {
          default = mkLumo pkgs;
          lumo = mkLumo pkgs;
          riff = mkLumo pkgs;
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs
            python3
            yt-dlp
            ffmpeg
          ];

          shellHook = ''
            echo "Lumo dev shell. Install deps and run with:"
            echo "  npm install && npm start"
          '';
        };
      })
    // {
      overlays.default = final: prev: {
        lumo = mkLumo final;
        riff = mkLumo final;
      };
    };
}
