import { IApi, utils } from 'umi';
import { basename, dirname, extname, join, relative } from 'path';
import { readFileSync } from 'fs';
import getModels from './getStores/getStores';

const { Mustache, lodash, winPath } = utils;


module.exports = (api) => {
  const { logger } = api;

  function getModelDir() {
    return api.config.singular ? 'store' : 'stores';
  }

  function getSrcModelsPath() {
    return join(api.paths.absSrcPath, getModelDir());
  }

  // 配置
  api.describe({
    key: 'mobx',
    config: {
      schema(joi) {
        return joi.object({
          skipModelValidate: joi.boolean(),
          extraModels: joi.array().items(joi.string()),
        });
      },
    },
  });

  function getAllModels() {
    const srcModelsPath = getSrcModelsPath();
    console.log(srcModelsPath, api.paths.absPagesPath)
    const baseOpts = {
      skipModelValidate: api.config.mobx?.skipModelValidate,
      extraModels: api.config.mobx?.extraModels,
    };
    return lodash.uniq([
      ...getModels({
        base: srcModelsPath,
        ...baseOpts,
      }),
      ...getModels({
        base: api.paths.absPagesPath,
        pattern: `**/${getModelDir()}/**/*.{ts,tsx,js,jsx}`,
        ...baseOpts,
      }),
      ...getModels({
        base: api.paths.absPagesPath,
        pattern: `**/store.{ts,tsx,js,jsx}`,
        ...baseOpts,
      }),
    ]);
  }

  let hasModels = false;

  // 初始检测一遍
  api.onStart(() => {
    hasModels = getAllModels().length > 0;
  });

  // 生成临时文件
  api.onGenerateFiles({
    async fn() {
      const models = getAllModels();
      hasModels = models.length > 0;

      logger.debug('mobx stores:');
      logger.debug(models);

      // 没有 models 不生成文件
      if (!hasModels) return;
      // mobx.ts
      const mobxTpl = readFileSync(join(__dirname, 'mobx.tpl'), 'utf-8');

      const modelsMap = models.map((path, index) => ({
        namespace: `'${basename(path, extname(path))}'`,
        model: `Model${lodash.upperFirst(lodash.camelCase(basename(path, extname(path))))}${index}`
      }))

      api.writeTmpFile({
        path: 'plugin-mobx/mobx.ts',
        content: Mustache.render(mobxTpl, {
          RegisterModelImports: models
            .map((path, index) => (
              `import Model${lodash.upperFirst(
                lodash.camelCase(basename(path, extname(path))),
              )}${index} from '${path.replace(/\.(t|j)s$/g, '')}';`
            ))
            .join('\r\n'),
          ReturnType: modelsMap.map(item => `typeof ${item.model}`).join(' | '),
          RegisterModalNamespaces: modelsMap.map(item => item.namespace).join(' | '),
          RegisterModelExportFunctions: modelsMap
            .map((item) => {
              return `export function useStore(namespace: ${item.namespace}): typeof ${item.model};`
            }).join('\r\n'),
          RegisterModels: modelsMap
            .map((item) => `pushStore(${item.namespace}, ${item.model})`.trim())
            .join('\r\n'),
        }),
      });

      // runtime.tsx
      const runtimeTpl = readFileSync(join(__dirname, 'runtime.tpl'), 'utf-8');
      api.writeTmpFile({
        path: 'plugin-mobx/runtime.tsx',
        content: Mustache.render(runtimeTpl, {
          SSR: !!api.config?.ssr,
        }),
      });
    },
    // 要比 preset-built-in 靠前
    // 在内部文件生成之前执行，这样 hasModels 设的值对其他函数才有效
    stage: -1,
  });

  // src/models 下的文件变化会触发临时文件生成
  api.addTmpGenerateWatcherPaths(() => [getSrcModelsPath()]);

  // mobx 优先读用户项目的依赖
  api.addProjectFirstLibraries(() => [
    { name: 'mobx', path: dirname(require.resolve('mobx/package.json')) },
  ]);

  // Runtime Plugin
  api.addRuntimePlugin(() =>
    hasModels ? [join(api.paths.absTmpPath, 'plugin-mobx/runtime.tsx')] : [],
  );
  api.addRuntimePluginKey(() => (hasModels ? ['mobx'] : []));

  // 导出内容
  api.addUmiExports(() =>
    hasModels
      ? [
          {
            exportAll: true,
            source: '../plugin-mobx/mobx',
          },
        ]
      : [],
  );

  api.registerCommand({
    name: 'mobx',
    fn({ args }) {
      if (args._[0] === 'list' && args._[1] === 'model') {
        const models = getAllModels();
        console.log();
        console.log(utils.chalk.bold('  Models in your project:'));
        console.log();
        models.forEach(model => {
          console.log(`    - ${relative(api.cwd, model)}`);
        });
        console.log();
        console.log(`  Totally ${models.length}.`);
        console.log();
      }
    },
  });
};

/*
type TStore = ReturnType<typeof createStore>;
const store = useLocalStore(createStore);
const storeContext = React.createContext<TStore | null>(store);

export default () => React.useContext(storeContext)
*/