"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _umi = require("umi");

var t = _umi.utils.t,
    traverse = _umi.utils.traverse,
    parser = _umi.utils.parser;

function getIdentifierDeclaration(node, path) {
  if (t.isIdentifier(node) && path.scope.hasBinding(node.name)) {
    var bindingNode = path.scope.getBinding(node.name).path.node;

    if (t.isVariableDeclarator(bindingNode)) {
      bindingNode = bindingNode.init;
    }

    return bindingNode;
  }

  return node;
}

function getTSNode(node) {
  if ( // <Model> {}
  t.isTSTypeAssertion(node) || // {} as Model
  t.isTSAsExpression(node)) {
    return node.expression;
  } else {
    return node;
  }
}

function isValidModel(_ref) {
  var content = _ref.content;
  var parser = _umi.utils.parser;
  var ast = parser.parse(content, {
    sourceType: 'module',
    plugins: ['typescript', 'classProperties', 'dynamicImport', 'exportDefaultFrom', 'exportNamespaceFrom', 'functionBind', 'nullishCoalescingOperator', 'objectRestSpread', 'optionalChaining', 'decorators-legacy']
  });
  var isStore = false;
  var imports = {};
  traverse.default(ast, {
    ImportDeclaration: function ImportDeclaration(path) {
      var _path$node = path.node,
          specifiers = _path$node.specifiers,
          source = _path$node.source;
      specifiers.forEach(function (specifier) {
        if (t.isImportDefaultSpecifier(specifier)) {
          imports[specifier.local.name] = source.value;
        }
      });
    },
    ExportDefaultDeclaration: function ExportDefaultDeclaration(path) {
      var node = path.node.declaration;
      node = getTSNode(node);
      node = getIdentifierDeclaration(node, path);
      node = getTSNode(node); // 支持 dva-model-extend

      if (t.isCallExpression(node) && t.isIdentifier(node.callee) && imports[node.callee.name] === 'dva-model-extend') {
        node = node.arguments[1];
        node = getTSNode(node);
        node = getIdentifierDeclaration(node, path);
        node = getTSNode(node);
      }

      if (t.isObjectExpression(node) && node.properties.some(function (property) {
        return ['state', 'computed', 'actions', 'namespace'].includes(property.key.name);
      })) {
        isStore = true;
      }
    }
  });
  return isStore;
}

var _default = isValidModel;
exports.default = _default;