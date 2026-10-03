// metro.config.js
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const withWind = withNativeWind(config, { input: "./src/global.css" });

// tslib's package exports map `import` to `tslib/modules/index.js`, which does
// `import * as tslib from "../tslib.js"` + `export *`. Metro's CommonJS interop
// turns that into a destructure of `tslib.default`, but tslib's CJS build sets
// `__esModule: true` without a `default` export — so every web/server bundle
// crashed with "Cannot destructure property '__extends' of 'tslib.default'".
// Always resolve the bare `tslib` specifier to the CJS build instead.
const previousResolveRequest = withWind.resolver.resolveRequest;
withWind.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "tslib" || moduleName.startsWith("tslib/")) {
    return {
      type: "sourceFile",
      filePath: path.join(__dirname, "node_modules", "tslib", "tslib.js"),
    };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withWind;
