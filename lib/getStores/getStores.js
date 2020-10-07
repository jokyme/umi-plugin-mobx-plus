"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _umi = require("umi");

var _fs = require("fs");

var _path = require("path");

var _isValidStore = _interopRequireDefault(require("./isValidStore"));

function getModels(opts) {
  return _umi.utils.lodash.uniq(_umi.utils.glob.sync(opts.pattern || '**/*.{ts,tsx,js,jsx}', {
    cwd: opts.base
  }).map(function (f) {
    return (0, _path.join)(opts.base, f);
  }).concat(opts.extraModels || []).map(_umi.utils.winPath)).filter(function (f) {
    if (/\.d.ts$/.test(f)) return false;
    if (/\.(test|e2e|spec).(j|t)sx?$/.test(f)) return false; // 允许通过配置下跳过 Model 校验

    if (opts.skipModelValidate) return true;
    return true; // TODO: fs cache for performance

    return (0, _isValidStore.default)({
      content: (0, _fs.readFileSync)(f, 'utf-8')
    });
  });
}

var _default = getModels;
exports.default = _default;