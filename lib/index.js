"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread2"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _umi = require("umi");

var _path = require("path");

var _fs = require("fs");

var _getStores = _interopRequireDefault(require("./getStores/getStores"));

var Mustache = _umi.utils.Mustache,
    lodash = _umi.utils.lodash,
    winPath = _umi.utils.winPath;

module.exports = function (api) {
  var logger = api.logger;

  function getModelDir() {
    return api.config.singular ? 'store' : 'stores';
  }

  function getSrcModelsPath() {
    return (0, _path.join)(api.paths.absSrcPath, getModelDir());
  } // 配置


  api.describe({
    key: 'mobx',
    config: {
      schema: function schema(joi) {
        return joi.object({
          skipModelValidate: joi.boolean(),
          extraModels: joi.array().items(joi.string())
        });
      }
    }
  });

  function getAllModels() {
    var _api$config$mobx, _api$config$mobx2;

    var srcModelsPath = getSrcModelsPath();
    console.log(srcModelsPath, api.paths.absPagesPath);
    var baseOpts = {
      skipModelValidate: (_api$config$mobx = api.config.mobx) === null || _api$config$mobx === void 0 ? void 0 : _api$config$mobx.skipModelValidate,
      extraModels: (_api$config$mobx2 = api.config.mobx) === null || _api$config$mobx2 === void 0 ? void 0 : _api$config$mobx2.extraModels
    };
    return lodash.uniq([].concat((0, _toConsumableArray2.default)((0, _getStores.default)((0, _objectSpread2.default)({
      base: srcModelsPath
    }, baseOpts))), (0, _toConsumableArray2.default)((0, _getStores.default)((0, _objectSpread2.default)({
      base: api.paths.absPagesPath,
      pattern: "**/".concat(getModelDir(), "/**/*.{ts,tsx,js,jsx}")
    }, baseOpts))), (0, _toConsumableArray2.default)((0, _getStores.default)((0, _objectSpread2.default)({
      base: api.paths.absPagesPath,
      pattern: "**/store.{ts,tsx,js,jsx}"
    }, baseOpts)))));
  }

  var hasModels = false; // 初始检测一遍

  api.onStart(function () {
    hasModels = getAllModels().length > 0;
  }); // 生成临时文件

  api.onGenerateFiles({
    fn: function () {
      var _fn = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee() {
        var _api$config;

        var models, mobxTpl, modelsMap, runtimeTpl;
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                models = getAllModels();
                hasModels = models.length > 0;
                logger.debug('mobx stores:');
                logger.debug(models); // 没有 models 不生成文件

                if (hasModels) {
                  _context.next = 6;
                  break;
                }

                return _context.abrupt("return");

              case 6:
                // mobx.ts
                mobxTpl = (0, _fs.readFileSync)((0, _path.join)(__dirname, 'mobx.tpl'), 'utf-8');
                modelsMap = models.map(function (path, index) {
                  return {
                    namespace: "'".concat((0, _path.basename)(path, (0, _path.extname)(path)), "'"),
                    model: "Model".concat(lodash.upperFirst(lodash.camelCase((0, _path.basename)(path, (0, _path.extname)(path))))).concat(index)
                  };
                });
                api.writeTmpFile({
                  path: 'plugin-mobx/mobx.ts',
                  content: Mustache.render(mobxTpl, {
                    RegisterModelImports: models.map(function (path, index) {
                      return "import Model".concat(lodash.upperFirst(lodash.camelCase((0, _path.basename)(path, (0, _path.extname)(path))))).concat(index, " from '").concat(path.replace(/\.(t|j)s$/g, ''), "';");
                    }).join('\r\n'),
                    ReturnType: modelsMap.map(function (item) {
                      return "typeof ".concat(item.model);
                    }).join(' | '),
                    RegisterModalNamespaces: modelsMap.map(function (item) {
                      return item.namespace;
                    }).join(' | '),
                    RegisterModelExportFunctions: modelsMap.map(function (item) {
                      return "export function useStore(namespace: ".concat(item.namespace, "): typeof ").concat(item.model, ";");
                    }).join('\r\n'),
                    RegisterModels: modelsMap.map(function (item) {
                      return "pushStore(".concat(item.namespace, ", ").concat(item.model, ")").trim();
                    }).join('\r\n')
                  })
                }); // runtime.tsx

                runtimeTpl = (0, _fs.readFileSync)((0, _path.join)(__dirname, 'runtime.tpl'), 'utf-8');
                api.writeTmpFile({
                  path: 'plugin-mobx/runtime.tsx',
                  content: Mustache.render(runtimeTpl, {
                    SSR: !!((_api$config = api.config) === null || _api$config === void 0 ? void 0 : _api$config.ssr)
                  })
                });

              case 11:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      function fn() {
        return _fn.apply(this, arguments);
      }

      return fn;
    }(),
    // 要比 preset-built-in 靠前
    // 在内部文件生成之前执行，这样 hasModels 设的值对其他函数才有效
    stage: -1
  }); // src/models 下的文件变化会触发临时文件生成

  api.addTmpGenerateWatcherPaths(function () {
    return [getSrcModelsPath()];
  }); // mobx 优先读用户项目的依赖

  api.addProjectFirstLibraries(function () {
    return [{
      name: 'mobx',
      path: (0, _path.dirname)(require.resolve('mobx/package.json'))
    }];
  }); // Runtime Plugin

  api.addRuntimePlugin(function () {
    return hasModels ? [(0, _path.join)(api.paths.absTmpPath, 'plugin-mobx/runtime.tsx')] : [];
  });
  api.addRuntimePluginKey(function () {
    return hasModels ? ['mobx'] : [];
  }); // 导出内容

  api.addUmiExports(function () {
    return hasModels ? [{
      exportAll: true,
      source: '../plugin-mobx/mobx'
    }] : [];
  });
  api.registerCommand({
    name: 'mobx',
    fn: function fn(_ref) {
      var args = _ref.args;

      if (args._[0] === 'list' && args._[1] === 'model') {
        var models = getAllModels();
        console.log();
        console.log(_umi.utils.chalk.bold('  Models in your project:'));
        console.log();
        models.forEach(function (model) {
          console.log("    - ".concat((0, _path.relative)(api.cwd, model)));
        });
        console.log();
        console.log("  Totally ".concat(models.length, "."));
        console.log();
      }
    }
  });
};
/*
type TStore = ReturnType<typeof createStore>;
const store = useLocalStore(createStore);
const storeContext = React.createContext<TStore | null>(store);

export default () => React.useContext(storeContext)
*/